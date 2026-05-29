import { redirect } from 'next/navigation'

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

export default function MetaStart() {
  const appId = process.env.META_APP_ID || process.env.APP_ID || DEFAULT_APP_ID
  const url = new URL('https://www.facebook.com/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  redirect(url.toString())
}
