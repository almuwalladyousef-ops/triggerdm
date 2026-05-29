'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RulesPage() {
  const [accounts, setAccounts] = useState([])
  const [rules, setRules] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

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

  async function handleDelete(e, ruleId) {
    e.preventDefault()
    if (!confirm('Delete this rule?')) return
    setDeleting(ruleId)
    await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== ruleId))
    setDeleting(null)
  }

  const filtered = activeTab === 'all'
    ? rules
    : rules.filter(r => r.igId === activeTab)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rules</h1>
        <Link href="/rules/new" className="btn-primary">+ New Rule</Link>
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
        <div className="rule-list">
          {filtered.map(rule => {
            const account = accounts.find(a => a.igId === rule.igId)
            return (
              <div key={rule.id} className="rule-card" style={{ display: 'flex', alignItems: 'center' }}>
                <Link href={`/rules/${rule.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
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
                <button
                  onClick={e => handleDelete(e, rule.id)}
                  disabled={deleting === rule.id}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: '16px', padding: '4px 8px',
                    opacity: deleting === rule.id ? 0.4 : 1,
                    flexShrink: 0, marginLeft: '8px',
                  }}
                  title="Delete rule"
                >
                  {deleting === rule.id ? '…' : '🗑'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
