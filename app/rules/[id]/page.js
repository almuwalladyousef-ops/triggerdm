import { getRules } from '@/lib/driveDB'
import RuleEditor from '@/components/RuleEditor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditRulePage({ params }) {
  const rules = await getRules()
  const rule = rules.find(r => r.id === params.id)

  if (!rule) notFound()

  return (
    <div className="page">
      <h1>Edit Rule</h1>
      <RuleEditor initial={rule} />
    </div>
  )
}
