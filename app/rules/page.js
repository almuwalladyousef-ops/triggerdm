import { getRules } from '@/lib/driveDB'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
  const rules = await getRules()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rules</h1>
        <Link href="/rules/new" className="btn-primary">+ New Rule</Link>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state">
          <p>No rules yet. <Link href="/rules/new">Create your first rule →</Link></p>
        </div>
      ) : (
        <div className="rule-list">
          {rules.map(rule => (
            <Link key={rule.id} href={`/rules/${rule.id}`} className="rule-card">
              <div className="rule-card-left">
                <span className="rule-name">{rule.name}</span>
                <span className="rule-keywords">{rule.keywords.join(', ')}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
