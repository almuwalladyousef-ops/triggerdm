import { getAccounts } from '@/lib/accounts'
import axios from 'axios'

const BASE = 'https://graph.facebook.com/v18.0'
const FIELDS = 'comments,live_comments,messages,message_reactions,messaging_handover,message_edit'

export async function POST(req) {
  const secret = req.headers.get('x-admin-secret')
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const accounts = getAccounts()
  const results = []

  for (const account of accounts) {
    try {
      const res = await axios.post(
        `${BASE}/${account.pageId}/subscribed_apps`,
        { subscribed_fields: FIELDS },
        { params: { access_token: account.token } }
      )
      results.push({ account: account.name, success: true, response: res.data })
    } catch (err) {
      results.push({
        account: account.name,
        success: false,
        error: err.response?.data ?? err.message,
      })
    }
  }

  return Response.json({ results })
}
