'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [rules, setRules] = useState([])
  const [stats, setStats] = useState({ totalDMs: 0, activeRules: 0, totalRules: 0 })
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/rules').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()),
    ]).then(([accs, rls, st]) => {
      setAccounts(accs)
      setRules(rls)
      setStats(st)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'all') {
      fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
    } else {
      fetch(`/api/stats?igId=${activeTab}`).then(r => r.json()).then(setStats).catch(() => {})
    }
  }, [activeTab])

  const activeRules = (activeTab === 'all' ? rules : rules.filter(r => r.igId === activeTab))
    .filter(r => r.active)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
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

      <div className="stat-cards">
        <div className="stat-card">
          <p className="stat-number">{stats.totalDMs}</p>
          <p className="stat-label">DMs Sent</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.activeRules}</p>
          <p className="stat-label">Active Rules</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.totalRules}</p>
          <p className="stat-label">Total Rules</p>
        </div>
      </div>

      <h2>Active Rules</h2>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : activeRules.length === 0 ? (
        <div className="empty-state">
          <p>No active rules. <Link href="/rules/new">Create your first rule →</Link></p>
        </div>
      ) : (
        <div className="rule-list">
          {activeRules.map(rule => {
            const account = accounts.find(a => a.igId === rule.igId)
            return (
              <Link key={rule.id} href={`/rules/${rule.id}`} className="rule-card">
                <div className="rule-card-left">
                  <span className="rule-name">{rule.name}</span>
                  <span className="rule-keywords">{rule.keywords.join(', ')}</span>
                  {account && <span className="rule-account">{account.name}</span>}
                </div>
                <div className="rule-card-right">
                  <span className="pill active">Active</span>
                  <span className="rule-meta">
                    {rule.applyToAll ? 'All reels' : `${rule.targetReels.length} reel${rule.targetReels.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
