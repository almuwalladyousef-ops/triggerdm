import { verifySignature } from '@/lib/verify'
import { getRules, hasBeenDMed, logDM } from '@/lib/driveDB'
import { replyToComment, sendPrivateReply } from '@/lib/instagram'
import { getAccountByIgId, getAccounts } from '@/lib/accounts'
import axios from 'axios'

const BASE = 'https://graph.facebook.com/v18.0'
const PAGE_WEBHOOK_FIELDS = 'feed,messages,message_reactions,messaging_handovers,message_edits'
const DEFAULT_COMMENT_REPLY = 'Sent you a DM.'

function isInstagramLoginToken(token) {
  return token?.startsWith('IGA')
}

async function subscribeAllPages() {
  const accounts = getAccounts()
  for (const account of accounts) {
    if (isInstagramLoginToken(account.token)) {
      console.log('[webhook] skipping page subscription for Instagram Login token:', account.name)
      continue
    }

    try {
      await axios.post(
        `${BASE}/${account.pageId}/subscribed_apps`,
        { subscribed_fields: PAGE_WEBHOOK_FIELDS },
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

  // Vercel serverless functions are not reliable for background work after
  // returning the response, so finish the webhook side effects before 200 OK.
  await processWebhook(rawBody)
  return new Response('OK', { status: 200 })
}

async function processWebhook(rawBody) {
  const body = JSON.parse(rawBody)
  console.log('[webhook] received:', JSON.stringify(body).slice(0, 500))

  for (const entry of body.entry || []) {
    const igAccountId = entry?.id

    for (const change of entry?.changes || []) {
      await processChange(igAccountId, change)
    }
  }
}

async function processChange(igAccountId, change) {
  console.log('[webhook] field:', change?.field, '| igAccountId:', igAccountId)
  if (change?.field !== 'comments') return

  const commentText = change.value?.text || ''
  const commentId = change.value?.id
  const commenterId = change.value?.from?.id
  const mediaId = change.value?.media?.id

  console.log('[webhook] comment:', commentText, '| commentId:', commentId, '| commenter:', commenterId, '| media:', mediaId)

  if (!commenterId || !commentId || !commentText) return

  const account = getAccountByIgId(igAccountId)
  console.log('[webhook] account found:', account?.name ?? 'NONE')
  if (!account) return

  const rules = await getRules()
  const lower = commentText.toLowerCase()

  for (const rule of rules) {
    if (!rule.active) continue
    if (rule.igId && rule.igId !== account.igId) { console.log('[webhook] rule', rule.name, 'skipped: account mismatch'); continue }

    const appliesToReel = rule.applyToAll || rule.targetReels?.includes(mediaId)
    if (!appliesToReel) { console.log('[webhook] rule', rule.name, 'skipped: reel mismatch'); continue }

    const matched = rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
    if (!matched) { console.log('[webhook] rule', rule.name, 'skipped: no keyword match'); continue }

    const alreadyDMed = await hasBeenDMed(rule.id, commenterId)
    if (alreadyDMed) { console.log('[webhook] rule', rule.name, 'skipped: already DMed'); continue }

    try {
      console.log('[webhook] sending private reply for rule:', rule.name)
      await sendPrivateReply(commentId, rule.messages, account.token, account.igId)
      await logDM(rule.id, commenterId)
      console.log('[webhook] private reply sent!')

      await replyToComment(commentId, rule.commentReply || DEFAULT_COMMENT_REPLY, account.token)
      console.log('[webhook] comment reply sent!')
    } catch (err) {
      console.error('[webhook] failed to process rule:', rule.name, err.response?.data ?? err.message)
    }
  }
}
