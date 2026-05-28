import axios from 'axios'
import { getAccounts } from './accounts.js'

const BASE = 'https://graph.facebook.com/v18.0'

// Send a sequence of messages to a user using the given page token
export async function sendDM(userId, messages, token, igId) {
  for (const msg of messages) {
    let messagePayload

    if (msg.type === 'text') {
      messagePayload = { text: msg.content }
    } else if (msg.type === 'link') {
      messagePayload = { text: msg.url }
    } else {
      continue
    }

    await axios.post(
      `${BASE}/${igId}/messages`,
      { recipient: { id: userId }, message: messagePayload },
      { params: { access_token: token } }
    )
  }
}

// Fetch reels from all connected accounts, tagged with their igId
export async function getReels() {
  const accounts = getAccounts()
  const results = []

  for (const account of accounts) {
    try {
      const res = await axios.get(`${BASE}/${account.igId}/media`, {
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
