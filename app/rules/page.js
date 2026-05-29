'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RulesPage() {
  const [accounts, setAccounts] = useState([])
  const [rules, setRules] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/rules').then(r => r.json()),
    ]).then(([accs, rls]) => {
      setAccounts(accs)
      setRules(rls)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'all'
    ? rules
    : rules.filter(r => r.igId === activeTab)

  function toggleSelect(e, id) {
    e.preventDefault()
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

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selected.size} rule${selected.size !== 1 ? 's' : ''}?`)) return
    setDeleting(true)
    await fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setRules(prev => prev.filter(r => !selected.has(r.id)))
    setSelected(new Set())
    setDeleting(false)
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rules</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              style={{
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '8px 16px', cursor: 'pointer',
                fontWeight: 600, opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          )}
          <Link href="/rules/new" className="btn-primary">+ New Rule</Link>
        </div>
      </div>

      <div className="account-tabs">
        <button
          className={`account-tab ${activeTab === 'all' ? 'selected' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Accounts
        </button>
        {accounts.map(a => (
          <button
            key={a.igId}
            className={`account-tab ${activeTab === a.igId ? 'selected' : ''}`}
            onClick={() => setActiveTab(a.igId)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No rules yet. <Link href="/rules/new">Create your first rule →</Link></p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {someSelected ? `${selected.size} selected` : 'Select all'}
            </span>
          </div>
          <div className="rule-list">
            {filtered.map(rule => {
              const account = accounts.find(a => a.igId === rule.igId)
              const isSelected = selected.has(rule.id)
              return (
                <div
                  key={rule.id}
                  className="rule-card"
                  style={{
                    display: 'flex', alignItems: 'center',
                    outline: isSelected ? '2px solid #6366f1' : 'none',
                    background: isSelected ? '#f5f3ff' : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => toggleSelect(e, rule.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0, marginRight: '12px' }}
                  />
                  <Link
                    href={`/rules/${rule.id}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="rule-card-left">
                      <span className="rule-name">{rule.name}</span>
                      <span className="rule-keywords">{rule.keywords.join(', ')}</span>
                      {account && <span className="rule-account">{account.name}</span>}
                    </div>
                    <div className="rule-card-right">
                      <span className={`pill ${rule.active ? 'active' : 'inactive'}`}>
                        {rule.active ? 'Active' : 'Paused'}
                      </span>
                      <span className="rule-meta">
                        {rule.applyToAll ? 'All reels' : `${rule.targetReels.length} reel${rule.targetReels.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
