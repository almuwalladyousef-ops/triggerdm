'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import RuleCard, { RuleCardSkeleton } from '@/components/RuleCard'
import WorkspaceSwitcher, { getStoredWorkspaceId, resolveActiveWorkspace, storeWorkspaceId } from '@/components/WorkspaceSwitcher'

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Date created' },
  { value: 'name', label: 'Name' },
  { value: 'dms', label: 'Most DMs sent' },
]

export default function RulesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [rules, setRules] = useState([])
  const [perRuleStats, setPerRuleStats] = useState({})
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [bulkAction, setBulkAction] = useState(null) // 'delete' | 'activate' | 'pause'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'paused'
  const [sort, setSort] = useState('updated')

  useEffect(() => {
    Promise.all([
      fetch('/api/workspaces').then(r => r.json()),
      fetch('/api/rules').then(r => r.json()),
      fetch('/api/stats?perRule=1').then(r => r.json()),
    ]).then(([wss, rls, stats]) => {
      const active = resolveActiveWorkspace(wss, getStoredWorkspaceId())
      setWorkspaces(wss)
      setActiveWorkspaceId(active?.id || null)
      if (active) storeWorkspaceId(active.id)
      setRules(rls)
      setPerRuleStats(stats.perRule || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
    let list = activeWorkspace
      ? rules.filter(r => r.workspaceId === activeWorkspace.id || (!r.workspaceId && r.igId === activeWorkspace.igId))
      : rules

    if (statusFilter === 'active') list = list.filter(r => r.active)
    if (statusFilter === 'paused') list = list.filter(r => !r.active)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.keywords?.some(kw => kw.includes(q))
      )
    }

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'dms') return (perRuleStats[b.id]?.count || 0) - (perRuleStats[a.id]?.count || 0)
      if (sort === 'created') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    })
  }, [rules, workspaces, activeWorkspaceId, statusFilter, search, sort, perRuleStats])

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r.id)))
    }
  }

  async function handleBulkDelete() {
    const names = [...selected].map(id => rules.find(r => r.id === id)?.name).filter(Boolean)
    if (!confirm(`Delete ${selected.size} rule${selected.size !== 1 ? 's' : ''}?\n\n${names.join('\n')}`)) return
    setBulkAction('delete')
    await fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setRules(prev => prev.filter(r => !selected.has(r.id)))
    setSelected(new Set())
    setBulkAction(null)
  }

  async function handleBulkActive(active) {
    setBulkAction(active ? 'activate' : 'pause')
    await fetch('/api/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], active }),
    })
    setRules(prev => prev.map(r => selected.has(r.id) ? { ...r, active } : r))
    setSelected(new Set())
    setBulkAction(null)
  }

  async function handleInlineToggle(id, active) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active } : r))
    await fetch('/api/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], active }),
    })
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0
  const isBusy = bulkAction !== null

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rules</h1>
        <Link href="/rules/new" className="btn-primary">+ New Rule</Link>
      </div>

      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onChange={setActiveWorkspaceId}
      />

      {/* Search + filter + sort bar */}
      <div className="rules-toolbar">
        <input
          className="rules-search"
          type="search"
          placeholder="Search by name or keyword…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="rules-filters">
          {['all', 'active', 'paused'].map(f => (
            <button
              key={f}
              className={`filter-btn ${statusFilter === f ? 'filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rule-list">
          {[1, 2, 3].map(i => <RuleCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">
            {search || statusFilter !== 'all' ? 'No rules match your filters' : 'No rules yet'}
          </p>
          <p className="empty-state__sub">
            {search || statusFilter !== 'all'
              ? 'Try changing your search or filter.'
              : 'Rules let you automatically DM anyone who comments a keyword on your reels.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link href="/rules/new" className="btn-primary">Create your first rule →</Link>
          )}
        </div>
      ) : (
        <>
          {/* Selection toolbar */}
          <div className="selection-toolbar">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span>{someSelected ? `${selected.size} of ${filtered.length} selected` : `${filtered.length} rule${filtered.length !== 1 ? 's' : ''}`}</span>
            </label>

            {someSelected && (
              <div className="bulk-actions">
                <button
                  className="bulk-btn bulk-btn--activate"
                  onClick={() => handleBulkActive(true)}
                  disabled={isBusy}
                >
                  {bulkAction === 'activate' ? 'Activating…' : 'Activate'}
                </button>
                <button
                  className="bulk-btn bulk-btn--pause"
                  onClick={() => handleBulkActive(false)}
                  disabled={isBusy}
                >
                  {bulkAction === 'pause' ? 'Pausing…' : 'Pause'}
                </button>
                <button
                  className="bulk-btn bulk-btn--delete"
                  onClick={handleBulkDelete}
                  disabled={isBusy}
                >
                  {bulkAction === 'delete' ? 'Deleting…' : `Delete ${selected.size}`}
                </button>
              </div>
            )}
          </div>

          <div className="rule-list">
            {filtered.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                account={workspaces.find(w => w.id === rule.workspaceId) || workspaces.find(w => w.igId === rule.igId)}
                ruleStats={perRuleStats[rule.id]}
                isSelected={selected.has(rule.id)}
                onToggleSelect={toggleSelect}
                onToggleActive={handleInlineToggle}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
