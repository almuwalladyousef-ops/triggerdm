import { logWebhookEvent, saveStoredToken } from '@/lib/driveDB'
import { getBaseUrlFromHeaders } from '@/lib/oauth'

const DEFAULT_INSTAGRAM_APP_ID = '2415208742325516'

const ACCOUNTS = {
  BUSINESS_PAGE_TOKEN: { label: 'Business', igEnvVar: 'BUSINESS_IG_ID' },
  PERSONAL_PAGE_TOKEN: { label: 'Personal', igEnvVar: 'PERSONAL_IG_ID' },
}

function resolveTarget(state) {
  const tokenKey = ACCOUNTS[state] ? state : 'BUSINESS_PAGE_TOKEN'
  return { tokenKey, label: ACCOUNTS[tokenKey].label, igId: process.env[ACCOUNTS[tokenKey].igEnvVar] }
}

async function exchangeCodeForToken(code, appId, appSecret, redirectUri) {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body,
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok || json.error_type || json.error) {
    throw new Error(json.error_message || json.error?.message || `Instagram token exchange failed: ${res.status}`)
  }
  return json
}

async function exchangeForLongLivedToken(shortLivedToken, appSecret) {
  const url = new URL('https://graph.instagram.com/access_token')
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('access_token', shortLivedToken)

  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Instagram long-lived exchange failed: ${res.status}`)
  }
  return json
}

async function fetchInstagramAccount(token) {
  const url = new URL('https://graph.instagram.com/v21.0/me')
  url.searchParams.set('fields', 'id,user_id,username,account_type')
  url.searchParams.set('access_token', token)

  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Instagram account lookup failed: ${res.status}`)
  }
  return json
}

export default async function InstagramCallback({ searchParams }) {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID || DEFAULT_INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || process.env.BUSINESS_APP_SECRET
  const { tokenKey, label, igId: targetIgId } = resolveTarget(searchParams?.state)

  try {
    if (searchParams?.error) {
      throw new Error(`${searchParams.error}: ${searchParams.error_description || ''}`)
    }
    if (!searchParams?.code) throw new Error('Missing OAuth code. Start from /auth/instagram/start, not this callback URL directly.')
    if (!appSecret) throw new Error('Missing INSTAGRAM_APP_SECRET/META_INSTAGRAM_APP_SECRET in Vercel')
    if (!targetIgId) throw new Error(`Missing ${ACCOUNTS[tokenKey].igEnvVar} in Vercel`)

    const redirectUri = `${await getBaseUrlFromHeaders()}/auth/instagram/callback`
    const shortLived = await exchangeCodeForToken(searchParams.code, appId, appSecret, redirectUri)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, appSecret)
    const account = await fetchInstagramAccount(longLived.access_token)

    if (account.user_id !== targetIgId && account.id !== targetIgId) {
      await logWebhookEvent({ type: 'instagram_oauth_no_match', tokenKey, targetIgId, account }).catch(() => {})
      return (
        <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
          <h1>No matching Instagram account found</h1>
          <p>Looking for {label} Instagram ID <strong>{targetIgId}</strong>, but Instagram returned:</p>
          <pre style={{ background: '#f4f4f4', padding: 16, borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(account, null, 2)}
          </pre>
          <p>If this is the correct account, update the matching IG ID environment variable to the returned <code>user_id</code>.</p>
          <p><a href={`/auth/instagram/start?account=${tokenKey}`}>Restart Instagram sign-in</a></p>
        </main>
      )
    }

    await saveStoredToken(tokenKey, longLived.access_token, {
      instagramLoginId: account.id,
      igId: account.user_id,
      igUsername: account.username,
      accountType: account.account_type,
      source: 'instagram_oauth_callback',
      expiresIn: longLived.expires_in,
    })
    await logWebhookEvent({
      type: 'instagram_oauth_success',
      tokenKey,
      instagramLoginId: account.id,
      igId: account.user_id,
      igUsername: account.username,
    })

    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>{label} account connected</h1>
        <p>Stored a refreshed Instagram Login token for <strong>@{account.username}</strong>.</p>
        <p>You can close this tab and test the automation again.</p>
      </main>
    )
  } catch (err) {
    await logWebhookEvent({
      type: 'instagram_oauth_failed',
      error: err.message,
      hasCode: Boolean(searchParams?.code),
      appId,
      targetIgId,
    }).catch(() => {})
    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>Instagram token setup failed</h1>
        <p>{err.message}</p>
        <p><a href={`/auth/instagram/start?account=${tokenKey}`}>Restart Instagram sign-in</a></p>
      </main>
    )
  }
}
