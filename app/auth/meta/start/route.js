import { NextResponse } from 'next/server'
import { getBaseUrlFromRequest } from '@/lib/oauth'

const DEFAULT_APP_ID = '1564935734963627'
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
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
  const redirectUri = `${getBaseUrlFromRequest(req)}/auth/meta/callback`
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('state', target)

  return NextResponse.redirect(url)
}
