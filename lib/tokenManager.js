import axios from 'axios'
import { logToken } from './driveDB.js'

export async function refreshToken() {
  const res = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      fb_exchange_token: process.env.PAGE_ACCESS_TOKEN,
    },
  })

  const { access_token, expires_in } = res.data

  const expiryDate = new Date(Date.now() + expires_in * 1000).toISOString().split('T')[0]

  await logToken(access_token, expiryDate)

  return { access_token, expiryDate }
}
