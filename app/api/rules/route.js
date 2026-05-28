import { NextResponse } from 'next/server'
import { getRules, saveRule } from '@/lib/driveDB'
import { v4 as uuid } from 'uuid'

export async function GET() {
  const rules = await getRules()
  return NextResponse.json(rules)
}

export async function POST(req) {
  const body = await req.json()

  const rule = {
    id: uuid(),
    name: body.name || 'Untitled Rule',
    active: body.active ?? true,
    applyToAll: body.applyToAll ?? false,
    targetReels: body.targetReels || [],
    keywords: body.keywords || [],
    messages: body.messages || [],
    createdAt: new Date().toISOString(),
  }

  await saveRule(rule)
  return NextResponse.json(rule, { status: 201 })
}
