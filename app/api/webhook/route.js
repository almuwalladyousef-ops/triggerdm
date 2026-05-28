import { NextResponse } from 'next/server'
import { verifySignature } from '@/lib/verify'
import { getRules, hasBeenDMed, logDM } from '@/lib/driveDB'
import { sendDM } from '@/lib/instagram'

// Meta webhook verification handshake
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// Incoming comment event from Meta
export async function POST(req) {
  // Respond 200 immediately so Meta doesn't retry
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Fire and forget — process after returning 200
  processWebhook(rawBody).catch(console.error)

  return new Response('OK', { status: 200 })
}

async function processWebhook(rawBody) {
  const body = JSON.parse(rawBody)

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]

  if (change?.field !== 'comments') return

  const commentText = change.value?.text || ''
  const commenterId = change.value?.from?.id
  const mediaId = change.value?.media?.id

  if (!commenterId || !commentText) return

  const rules = await getRules()

  for (const rule of rules) {
    if (!rule.active) continue

    // Check if this rule applies to the reel
    const appliesToReel = rule.applyToAll || rule.targetReels?.includes(mediaId)
    if (!appliesToReel) continue

    // Check keyword match (case-insensitive)
    const lower = commentText.toLowerCase()
    const matched = rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
    if (!matched) continue

    // Deduplication — skip if already DMed for this rule
    const alreadyDMed = await hasBeenDMed(rule.id, commenterId)
    if (alreadyDMed) continue

    await sendDM(commenterId, rule.messages)
    await logDM(rule.id, commenterId)
  }
}
