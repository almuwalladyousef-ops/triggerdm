'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import RuleCard from '@/components/RuleCard'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [rules, setRules] = useState([])
  const [stats, setStats] = useState({ totalDMs: 0, activeRules: 0, totalRules: 0, daily7Day: {}, tokenStatus: null })
  const [perRuleStats, setPerRuleStats] = useState({})
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/rules').then(r => r.json()),
      fetch('/api/stats?perRule=1').then(r => r.json()),
    ]).then(([accs, rls, st]) => {
      setAccounts(accs)
      setRules(rls)
      setStats(st)
      setPerRuleStats(st.perRule || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const url = activeTab === 'all' ? '/api/stats?perRule=1' : `/api/stats?igId=${activeTab}&perRule=1`
    fetch(url).then(r => r.json()).then(st => {
      setStats(st)
      setPerRuleStats(st.perRule || {})
    }).catch(() => {})
  }, [activeTab])

  const activeRules = (activeTab === 'all' ? rules : rules.filter(r => r.igId === activeTab))
    .filter(r => r.active)

  const daily = stats.daily7Day || {}
  const dailyKeys = Object.keys(daily).sort()
  const maxDaily = Math.max(...Object.values(daily), 1)

  const token = stats.tokenStatus
  const tokenExpiringSoon = token?.daysUntilExpiry != null && token.daysUntilExpiry <= 14

  return (
    <div className="page">
      {tokenExpiringSoon && (
        <div className={`token-banner ${token.daysUntilExpiry <= 3 ? 'token-banner--danger' : 'token-banner--warn'}`}>
          {token.daysUntilExpiry <= 0
            ? '🔴 Your Instagram access token has expired. Automations are paused until you refresh it.'
            : `⚠️ Your Instagram access token expires in ${token.daysUntilExpiry} day${token.daysUntilExpiry !== 1 ? 's' : ''}. Refresh it before it expires.`}
        </div>
      )}

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
          <p className="stat-label">Total DMs Sent</p>
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

      {/* 7-day chart */}
      {dailyKeys.length > 0 && (
        <div className="daily-chart-card">
          <h2>DMs sent — last 7 days</h2>
          <div className="daily-chart">
            {dailyKeys.map(day => {
              const count = daily[day] || 0
              const pct = Math.round((count / maxDaily) * 100)
              return (
                <div key={day} className="daily-bar-col">
                  <span className="daily-bar-count">{count > 0 ? count : ''}</span>
                  <div className="daily-bar-track">
                    <div className="daily-bar-fill" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="daily-bar-label">
                    {new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <h2>Active Rules</h2>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : activeRules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🤖</div>
          <p className="empty-state__title">No active rules</p>
          <p className="empty-state__sub">Create a rule to start sending automatic DMs when people comment on your reels.</p>
          <Link href="/rules/new" className="btn-primary">Create your first rule →</Link>
        </div>
      ) : (
        <div className="rule-list">
          {activeRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              account={accounts.find(a => a.igId === rule.igId)}
              ruleStats={perRuleStats[rule.id]}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}
