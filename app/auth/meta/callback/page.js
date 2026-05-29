import { logWebhookEvent, saveStoredToken } from '@/lib/driveDB'

const GRAPH_VERSION = 'v18.0'
const DEFAULT_APP_ID = '1564935734963627'
const TARGET_IG_ID = process.env.BUSINESS_IG_ID
const TARGET_TOKEN_KEY = 'BUSINESS_PAGE_TOKEN'
const REDIRECT_URI = 'https://triggerdm.vercel.app/auth/meta/callback'

async function graph(path, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value)
  }
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph request failed: ${res.status}`)
  }
  return json
}

export default async function MetaCallback({ searchParams }) {
  const appId = process.env.META_APP_ID || process.env.APP_ID || DEFAULT_APP_ID
  const appSecret = process.env.META_APP_SECRET || process.env.APP_SECRET || process.env.BUSINESS_APP_SECRET

  try {
    if (searchParams?.error) {
      throw new Error(`${searchParams.error}: ${searchParams.error_description || ''}`)
    }
    if (!searchParams?.code) throw new Error('Missing OAuth code')
    if (!appSecret) throw new Error('Missing META_APP_SECRET/BUSINESS_APP_SECRET in Vercel')
    if (!TARGET_IG_ID) throw new Error('Missing BUSINESS_IG_ID in Vercel')

    const shortLived = await graph('oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: REDIRECT_URI,
      code: searchParams.code,
    })

    const longLived = await graph('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLived.access_token,
    })

    const pages = await graph('me/accounts', {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      access_token: longLived.access_token,
    })

    const page = (pages.data || []).find(p => p.instagram_business_account?.id === TARGET_IG_ID)
    if (!page?.access_token) {
      throw new Error(`No Page token found for business Instagram ID ${TARGET_IG_ID}`)
    }

    await saveStoredToken(TARGET_TOKEN_KEY, page.access_token, {
      pageId: page.id,
      pageName: page.name,
      igId: page.instagram_business_account?.id,
      igUsername: page.instagram_business_account?.username,
      source: 'meta_oauth_callback',
    })
    await logWebhookEvent({
      type: 'meta_oauth_success',
      tokenKey: TARGET_TOKEN_KEY,
      pageId: page.id,
      pageName: page.name,
      igId: page.instagram_business_account?.id,
      igUsername: page.instagram_business_account?.username,
    })

    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>Business token connected</h1>
        <p>Stored a refreshed Page token for <strong>{page.name}</strong>.</p>
        <p>You can close this tab and test the business automation again.</p>
      </main>
    )
  } catch (err) {
    await logWebhookEvent({
      type: 'meta_oauth_failed',
      error: err.message,
      hasCode: Boolean(searchParams?.code),
      appId,
      targetIgId: TARGET_IG_ID,
    }).catch(() => {})
    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>Token setup failed</h1>
        <p>{err.message}</p>
      </main>
    )
  }
}
