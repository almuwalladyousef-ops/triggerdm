import { NextResponse } from 'next/server'
import { getRules, saveRule, deleteRule } from '@/lib/driveDB'

export async function GET(req, { params }) {
  const rules = await getRules()
  const rule = rules.find(r => r.id === params.id)
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rule)
}

export async function PUT(req, { params }) {
  const body = await req.json()
  const rules = await getRules()
  const existing = rules.find(r => r.id === params.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = { ...existing, ...body, id: params.id }
  await saveRule(updated)
  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  await deleteRule(params.id)
  return NextResponse.json({ success: true })
}
