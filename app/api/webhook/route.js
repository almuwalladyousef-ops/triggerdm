import { verifySignature } from '@/lib/verify'
import { getRules, hasBeenDMed, logDM } from '@/lib/driveDB'
import { sendDM } from '@/lib/instagram'
import { getAccountByIgId, getAccounts } from '@/lib/accounts'
import axios from 'axios'

const BASE = 'https://graph.facebook.com/v18.0'
const WEBHOOK_FIELDS = 'comments,live_comments,messages,message_reactions,messaging_handover,message_edit'

async function subscribeAllPages() {
  const accounts = getAccounts()
  for (const account of accounts) {
    try {
      await axios.post(
        `${BASE}/${account.pageId}/subscribed_apps`,
        { subscribed_fields: WEBHOOK_FIELDS },
        { params: { access_token: account.token } }
      )
      console.log('[webhook] subscribed page for:', account.name)
    } catch (err) {
      console.error('[webhook] failed to subscribe page for:', account.name, err.response?.data ?? err.message)
    }
  }
}

// Meta webhook verification handshake
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    subscribeAllPages().catch(console.error)
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
  console.log('[webhook] received:', JSON.stringify(body).slice(0, 500))

  const entry = body.entry?.[0]
  const igAccountId = entry?.id
  const change = entry?.changes?.[0]

  console.log('[webhook] field:', change?.field, '| igAccountId:', igAccountId)

  if (change?.field !== 'comments') return

  const commentText = change.value?.text || ''
  const commenterId = change.value?.from?.id
  const mediaId = change.value?.media?.id

  console.log('[webhook] comment:', commentText, '| commenter:', commenterId, '| media:', mediaId)

  if (!commenterId || !commentText) return

  const account = getAccountByIgId(igAccountId)
  console.log('[webhook] account found:', account?.name ?? 'NONE')
  if (!account) return

  const rules = await getRules()
  const lower = commentText.toLowerCase()

  for (const rule of rules) {
    if (!rule.active) continue

    const appliesToReel = rule.applyToAll || rule.targetReels?.includes(mediaId)
    if (!appliesToReel) { console.log('[webhook] rule', rule.name, 'skipped: reel mismatch'); continue }

    const matched = rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
    if (!matched) { console.log('[webhook] rule', rule.name, 'skipped: no keyword match'); continue }

    const alreadyDMed = await hasBeenDMed(rule.id, commenterId)
    if (alreadyDMed) { console.log('[webhook] rule', rule.name, 'skipped: already DMed'); continue }

    console.log('[webhook] sending DM for rule:', rule.name)
    await sendDM(commenterId, rule.messages, account.token, account.igId)
    await logDM(rule.id, commenterId)
    console.log('[webhook] DM sent!')
  }
}
