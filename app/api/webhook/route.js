import { verifySignature } from '@/lib/verify'
import { getRules, hasBeenDMed, logDM } from '@/lib/driveDB'
import { sendDM } from '@/lib/instagram'
import { getAccountByIgId, getAccounts } from '@/lib/accounts'

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

export async function POST(req) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  // Verify signature against any connected account's app secret
  const accounts = getAccounts()
  const validSig = accounts.some(a => verifySignature(rawBody, signature, a.appSecret))
  if (!validSig) {
    return new Response('Forbidden', { status: 403 })
  }

  // Respond 200 immediately so Meta doesn't retry
  processWebhook(rawBody).catch(console.error)
  return new Response('OK', { status: 200 })
}

async function processWebhook(rawBody) {
  const body = JSON.parse(rawBody)

  const entry = body.entry?.[0]
  const igAccountId = entry?.id  // Instagram account ID that received the comment
  const change = entry?.changes?.[0]

  if (change?.field !== 'comments') return

  const commentText = change.value?.text || ''
  const commenterId = change.value?.from?.id
  const mediaId = change.value?.media?.id

  if (!commenterId || !commentText) return

  // Find which account this event is for
  const account = getAccountByIgId(igAccountId)
  if (!account) return

  const rules = await getRules()
  const lower = commentText.toLowerCase()

  for (const rule of rules) {
    if (!rule.active) continue

    const appliesToReel = rule.applyToAll || rule.targetReels?.includes(mediaId)
    if (!appliesToReel) continue

    const matched = rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
    if (!matched) continue

    const alreadyDMed = await hasBeenDMed(rule.id, commenterId)
    if (alreadyDMed) continue

    await sendDM(commenterId, rule.messages, account.token)
    await logDM(rule.id, commenterId)
  }
}
