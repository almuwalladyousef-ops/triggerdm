import { logWebhookEvent, savePendingMetaSelection, saveStoredToken } from '@/lib/driveDB'
import { getBaseUrlFromHeaders } from '@/lib/oauth'
import { getWorkspaces, updateWorkspace } from '@/lib/workspaces'

const GRAPH_VERSION = 'v21.0'

// Which account this OAuth run is for. Passed through as `state` by /auth/meta/start.
const ACCOUNTS = {
  BUSINESS_PAGE_TOKEN: { label: 'Business', igEnvVar: 'BUSINESS_IG_ID' },
  PERSONAL_PAGE_TOKEN: { label: 'Personal', igEnvVar: 'PERSONAL_IG_ID' },
}

async function resolveTarget(state) {
  if (state?.startsWith('ws:') || state?.startsWith('workspace:')) {
    const workspaceId = state.startsWith('ws:') ? state.slice(3) : state.slice('workspace:'.length)
    const workspaces = await getWorkspaces()
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (!workspace) throw new Error('Workspace not found. Create it again and restart Meta sign-in.')

    return {
      tokenKey: workspace.tokenKey || `WORKSPACE_TOKEN:${workspace.id}`,
      label: workspace.name,
      igId: workspace.igId || null,
      workspaceId: workspace.id,
      allowAnyAccount: true,
    }
  }

  const tokenKey = ACCOUNTS[state] ? state : 'BUSINESS_PAGE_TOKEN'
  return { tokenKey, label: ACCOUNTS[tokenKey].label, igId: process.env[ACCOUNTS[tokenKey].igEnvVar], workspaceId: null, allowAnyAccount: false }
}

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
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  let target = null

  try {
    target = await resolveTarget(searchParams?.state)
    const { tokenKey, label, igId: TARGET_IG_ID, workspaceId, allowAnyAccount } = target

    if (searchParams?.error) {
      throw new Error(`${searchParams.error}: ${searchParams.error_description || ''}`)
    }
    if (!searchParams?.code) throw new Error('Missing OAuth code. Start from /auth/meta/start, not this callback URL directly.')
    if (!appId) throw new Error('Missing META_APP_ID in Vercel')
    if (!appSecret) throw new Error('Missing META_APP_SECRET in Vercel')
    if (!allowAnyAccount && !TARGET_IG_ID) throw new Error(`Missing ${ACCOUNTS[tokenKey].igEnvVar} in Vercel`)

    const redirectUri = `${await getBaseUrlFromHeaders()}/auth/meta/callback`
    const shortLived = await graph('oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
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

    const eligiblePages = (pages.data || []).filter(p => p.access_token && p.instagram_business_account?.id)
    if (allowAnyAccount && eligiblePages.length > 1) {
      const pendingId = await savePendingMetaSelection({
        tokenKey,
        workspaceId,
        pages: eligiblePages,
      })

      return (
        <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5, maxWidth: 760 }}>
          <h1>Choose an Instagram account</h1>
          <p>Meta returned multiple Instagram Business accounts. Pick the one to connect to <strong>{label}</strong>.</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {eligiblePages.map(candidate => (
              <form key={candidate.id} method="POST" action="/api/workspaces/connect-meta">
                <input type="hidden" name="pendingId" value={pendingId} />
                <input type="hidden" name="pageId" value={candidate.id} />
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    background: '#fff',
                    padding: 16,
                    cursor: 'pointer',
                  }}
                >
                  <strong>@{candidate.instagram_business_account.username || candidate.instagram_business_account.id}</strong>
                  <span style={{ display: 'block', color: '#555', marginTop: 4 }}>
                    Page: {candidate.name}
                  </span>
                </button>
              </form>
            ))}
          </div>
          <p style={{ marginTop: 24 }}>
            <a href={`/auth/meta/start?workspace=${workspaceId}`}>Restart Meta sign-in</a>
          </p>
        </main>
      )
    }

    const page = allowAnyAccount
      ? eligiblePages[0]
      : eligiblePages.find(p => p.instagram_business_account?.id === TARGET_IG_ID)
    if (!page?.access_token) {
      const available = (pages.data || []).map(p => ({
        pageId: p.id,
        pageName: p.name,
        igId: p.instagram_business_account?.id || null,
        igUsername: p.instagram_business_account?.username || null,
      }))
      await logWebhookEvent({ type: 'meta_oauth_no_match', tokenKey, workspaceId, targetIgId: TARGET_IG_ID, available }).catch(() => {})
      return (
        <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
          <h1>No matching page found</h1>
          <p>
            {allowAnyAccount
              ? `No Instagram Business account was available for ${label}.`
              : <>Looking for {label} Instagram ID <strong>{TARGET_IG_ID}</strong>, but the pages you granted were:</>}
          </p>
          <pre style={{ background: '#f4f4f4', padding: 16, borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(available, null, 2)}
          </pre>
          <p>The page needs an Instagram Business account connected, and you need to grant that page during Meta sign-in.</p>
          <p><a href={workspaceId ? `/auth/meta/start?workspace=${workspaceId}` : `/auth/meta/start?account=${tokenKey}`}>Restart Meta sign-in</a></p>
        </main>
      )
    }

    await saveStoredToken(tokenKey, page.access_token, {
      pageId: page.id,
      pageName: page.name,
      igId: page.instagram_business_account?.id,
      igUsername: page.instagram_business_account?.username,
      source: 'meta_oauth_callback',
    })
    if (workspaceId) {
      await updateWorkspace(workspaceId, {
        igId: page.instagram_business_account?.id,
        pageId: page.id,
        igUsername: page.instagram_business_account?.username,
        accountName: page.instagram_business_account?.username
          ? `@${page.instagram_business_account.username}`
          : page.name,
      })
    }
    await logWebhookEvent({
      type: 'meta_oauth_success',
      tokenKey,
      workspaceId,
      pageId: page.id,
      pageName: page.name,
      igId: page.instagram_business_account?.id,
      igUsername: page.instagram_business_account?.username,
    })

    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>{label} account connected</h1>
        <p>Stored a refreshed Page token for <strong>{page.name}</strong>.</p>
        <p>You can close this tab and test the automation again.</p>
      </main>
    )
  } catch (err) {
    await logWebhookEvent({
      type: 'meta_oauth_failed',
      error: err.message,
      hasCode: Boolean(searchParams?.code),
      appId,
      targetIgId: target?.igId,
      workspaceId: target?.workspaceId,
    }).catch(() => {})
    return (
      <main style={{ fontFamily: 'sans-serif', padding: 32, lineHeight: 1.5 }}>
        <h1>Token setup failed</h1>
        <p>{err.message}</p>
        <p><a href={target?.workspaceId ? `/auth/meta/start?workspace=${target.workspaceId}` : '/auth/meta/start'}>Restart Meta sign-in</a></p>
      </main>
    )
  }
}
