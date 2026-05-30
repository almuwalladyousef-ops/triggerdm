import { NextResponse } from 'next/server'

const DEFAULT_APP_ID = '1564935734963627'
const REDIRECT_URI = 'https://triggerdm.vercel.app/auth/meta/callback'
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_messaging',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
]

const VALID_ACCOUNTS = new Set(['BUSINESS_PAGE_TOKEN', 'PERSONAL_PAGE_TOKEN'])

export const dynamic = 'force-dynamic'

export function GET(req) {
  const requested = new URL(req.url).searchParams.get('account')
  const target = VALID_ACCOUNTS.has(requested) ? requested : 'BUSINESS_PAGE_TOKEN'

  const appId = process.env.META_APP_ID || process.env.APP_ID || DEFAULT_APP_ID
  const url = new URL('https://www.facebook.com/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('state', target)

  return NextResponse.redirect(url)
}
