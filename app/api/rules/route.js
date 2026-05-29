import { NextResponse } from 'next/server'
import { getRules, saveRule } from '@/lib/driveDB'
import { v4 as uuid } from 'uuid'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const igId = searchParams.get('igId')
  const rules = await getRules()
  return NextResponse.json(igId ? rules.filter(r => r.igId === igId) : rules)
}

export async function POST(req) {
  const body = await req.json()

  const rule = {
    id: uuid(),
    name: body.name || 'Untitled Rule',
    active: body.active ?? true,
    igId: body.igId || null,
    applyToAll: body.applyToAll ?? false,
    targetReels: body.targetReels || [],
    keywords: body.keywords || [],
    messages: body.messages || [],
    commentReply: body.commentReply || 'Sent you a DM.',
    createdAt: new Date().toISOString(),
  }

  await saveRule(rule)
  return NextResponse.json(rule, { status: 201 })
}
