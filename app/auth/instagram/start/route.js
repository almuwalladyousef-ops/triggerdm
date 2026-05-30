import { NextResponse } from 'next/server'

const DEFAULT_INSTAGRAM_APP_ID = '2415208742325516'
const REDIRECT_URI = 'https://triggerdm.vercel.app/auth/instagram/callback'
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
]

const VALID_ACCOUNTS = new Set(['BUSINESS_PAGE_TOKEN', 'PERSONAL_PAGE_TOKEN'])

export const dynamic = 'force-dynamic'

export function GET(req) {
  const requested = new URL(req.url).searchParams.get('account')
  const target = VALID_ACCOUNTS.has(requested) ? requested : 'BUSINESS_PAGE_TOKEN'
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID || DEFAULT_INSTAGRAM_APP_ID

  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('enable_fb_login', '0')
  url.searchParams.set('force_authentication', '1')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('state', target)

  return NextResponse.redirect(url)
}
