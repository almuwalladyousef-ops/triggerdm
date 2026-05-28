import axios from 'axios'

const BASE = 'https://graph.facebook.com/v18.0'

// Send a sequence of messages to a user via Instagram DM
export async function sendDM(userId, messages) {
  const token = process.env.PAGE_ACCESS_TOKEN

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
      `${BASE}/me/messages`,
      {
        recipient: { id: userId },
        message: messagePayload,
      },
      { params: { access_token: token } }
    )
  }
}

// Fetch the user's reels from Instagram Graph API
export async function getReels() {
  const token = process.env.PAGE_ACCESS_TOKEN
  const pageId = process.env.PAGE_ID

  const res = await axios.get(`${BASE}/${pageId}/media`, {
    params: {
      fields: 'id,caption,media_type,thumbnail_url,permalink,timestamp',
      access_token: token,
    },
  })

  return (res.data.data || []).filter(m =>
    m.media_type === 'VIDEO' || m.media_type === 'REEL'
  )
}

// Fetch metadata for a single reel
export async function getReelInfo(reelId) {
  const token = process.env.PAGE_ACCESS_TOKEN

  const res = await axios.get(`${BASE}/${reelId}`, {
    params: {
      fields: 'id,caption,thumbnail_url,permalink',
      access_token: token,
    },
  })

  return res.data
}
