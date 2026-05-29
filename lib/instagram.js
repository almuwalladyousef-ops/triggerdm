import axios from 'axios'
import { getAccounts } from './accounts.js'

const FACEBOOK_BASE = 'https://graph.facebook.com/v18.0'
const INSTAGRAM_BASE = 'https://graph.instagram.com/v18.0'
const instagramLoginAccountCache = new Map()

function isInstagramLoginToken(token) {
  return token?.startsWith('IGA')
}

async function getInstagramLoginAccount(token) {
  if (instagramLoginAccountCache.has(token)) {
    return instagramLoginAccountCache.get(token)
  }

  const res = await axios.get(`${INSTAGRAM_BASE}/me`, {
    params: {
      fields: 'id,user_id,username,account_type',
      access_token: token,
    },
  })

  instagramLoginAccountCache.set(token, res.data)
  return res.data
}

function messageToText(msg) {
  if (msg.type === 'text') return msg.content?.trim()
  if (msg.type === 'link') return msg.url?.trim()
  return ''
}

function buildPrivateReplyText(messages) {
  return messages
    .map(messageToText)
    .filter(Boolean)
    .join('\n\n')
}

// Private replies must target the Instagram comment ID, not the commenter ID.
export async function sendPrivateReply(commentId, messages, token, igId) {
  const text = buildPrivateReplyText(messages)
  if (!commentId || !text) {
    throw new Error('Cannot send private reply without a comment ID and message text')
  }

  if (isInstagramLoginToken(token)) {
    const account = await getInstagramLoginAccount(token)
    await axios.post(
      `${INSTAGRAM_BASE}/${account.id}/messages`,
      {
        recipient: { comment_id: commentId },
        message: { text },
      },
      { params: { access_token: token } }
    )
    return
  }

  await axios.post(
    `${FACEBOOK_BASE}/${igId}/messages`,
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
    { params: { access_token: token } }
  )
}

export async function replyToComment(commentId, message, token) {
  const text = message?.trim()
  if (!commentId || !text) return

  const body = new URLSearchParams({ message: text }).toString()
  const config = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    params: { access_token: token },
  }
  const bases = isInstagramLoginToken(token)
    ? [INSTAGRAM_BASE, FACEBOOK_BASE]
    : [FACEBOOK_BASE, INSTAGRAM_BASE]

  let lastError
  for (const base of bases) {
    try {
      await axios.post(`${base}/${commentId}/replies`, body, config)
      return
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

// Fetch reels from all connected accounts, tagged with their igId
export async function getReels() {
  const accounts = getAccounts()
  const results = []

  for (const account of accounts) {
    try {
      const base = isInstagramLoginToken(account.token) ? INSTAGRAM_BASE : FACEBOOK_BASE
      const accountId = isInstagramLoginToken(account.token)
        ? (await getInstagramLoginAccount(account.token)).id
        : account.igId

      const res = await axios.get(`${base}/${accountId}/media`, {
        params: {
          fields: 'id,caption,media_type,thumbnail_url,permalink,timestamp',
          access_token: account.token,
        },
      })

      const reels = (res.data.data || [])
        .filter(m => m.media_type === 'VIDEO' || m.media_type === 'REEL')
        .map(r => ({ ...r, accountName: account.name, igId: account.igId }))

      results.push(...reels)
    } catch {
      // Skip accounts with errors (e.g. missing permissions)
    }
  }

  return results
}
