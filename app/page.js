import { getStats, getRules } from '@/lib/driveDB'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const [stats, rules] = await Promise.all([getStats(), getRules()])
  const activeRules = rules.filter(r => r.active)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link href="/rules/new" className="btn-primary">+ New Rule</Link>
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
      {activeRules.length === 0 ? (
        <div className="empty-state">
          <p>No active rules. <Link href="/rules/new">Create your first rule →</Link></p>
        </div>
      ) : (
        <div className="rule-list">
          {activeRules.map(rule => (
            <Link key={rule.id} href={`/rules/${rule.id}`} className="rule-card">
              <div className="rule-card-left">
                <span className="rule-name">{rule.name}</span>
                <span className="rule-keywords">{rule.keywords.join(', ')}</span>
              </div>
              <div className="rule-card-right">
                <span className="pill active">Active</span>
                <span className="rule-meta">
                  {rule.applyToAll ? 'All reels' : `${rule.targetReels.length} reel${rule.targetReels.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
