import { NextResponse } from 'next/server'
import { getStats, getRules } from '@/lib/driveDB'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const igId = searchParams.get('igId')

  const [stats, rules] = await Promise.all([getStats(), getRules()])
  const filtered = igId ? rules.filter(r => r.igId === igId) : rules

  return NextResponse.json({
    totalDMs: stats.totalDMs,
    totalRules: filtered.length,
    activeRules: filtered.filter(r => r.active).length,
  })
}
