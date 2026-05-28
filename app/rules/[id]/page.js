import { getRules } from '@/lib/driveDB'
import RuleEditor from '@/components/RuleEditor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditRulePage({ params }) {
  let rules = []
  try { rules = await getRules() } catch { /* DB not configured yet */ }
  const rule = rules.find(r => r.id === params.id)

  if (!rule) notFound()

  return (
    <div className="page">
      <h1>Edit Rule</h1>
      <RuleEditor initial={rule} />
    </div>
  )
}
