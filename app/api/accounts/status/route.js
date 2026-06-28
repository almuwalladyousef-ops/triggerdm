import { NextResponse } from 'next/server'
import axios from 'axios'
import { getAccountsWithStoredTokens } from '@/lib/accounts'

const FACEBOOK_BASE = 'https://graph.facebook.com/v21.0'
const INSTAGRAM_BASE = 'https://graph.instagram.com/v21.0'

export const dynamic = 'force-dynamic'

async function checkToken(account) {
  const base = account.token?.startsWith('IGA') ? INSTAGRAM_BASE : FACEBOOK_BASE
  try {
    await axios.get(`${base}/me`, {
      params: { fields: 'id,name', access_token: account.token },
    })
    return { valid: true, error: null }
  } catch (err) {
    const e = err.response?.data?.error
    return { valid: false, error: e?.message || err.message }
  }
}

export async function GET() {
  const accounts = await getAccountsWithStoredTokens()
  const results = await Promise.all(
    accounts.map(async account => {
      const { valid, error } = await checkToken(account)
      return {
        name: account.name,
        igId: account.igId,
        key: account.key,
        authType: account.token?.startsWith('IGA') ? 'instagram' : 'facebook',
        valid,
        error,
      }
    })
  )
  return NextResponse.json(results)
}
