import { getStoredToken } from './driveDB.js'

const INSTAGRAM_BASE = 'https://graph.instagram.com/v21.0'
const instagramLoginAccountCache = new Map()

function isInstagramLoginToken(token) {
  return token?.startsWith('IGA')
}

async function getInstagramLoginAccount(token) {
  if (instagramLoginAccountCache.has(token)) {
    return instagramLoginAccountCache.get(token)
  }

  const res = await fetch(`${INSTAGRAM_BASE}/me?fields=id,user_id,username,account_type&access_token=${encodeURIComponent(token)}`)
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Could not resolve Instagram Login account')
  }

  instagramLoginAccountCache.set(token, json)
  return json
}

function baseAccounts() {
  return [
    {
      key: 'PERSONAL_PAGE_TOKEN',
      name: 'Personal (Yousef)',
      igId: process.env.PERSONAL_IG_ID,
      pageId: process.env.PERSONAL_PAGE_ID,
      token: process.env.PERSONAL_PAGE_TOKEN,
      appSecret: process.env.PERSONAL_APP_SECRET,
    },
    {
      key: 'BUSINESS_PAGE_TOKEN',
      name: 'Business (Traceback)',
      igId: process.env.BUSINESS_IG_ID,
      pageId: process.env.BUSINESS_PAGE_ID,
      token: process.env.BUSINESS_PAGE_TOKEN,
      appSecret: process.env.BUSINESS_APP_SECRET,
    },
  ].filter(a => a.igId && a.token)
}

// Returns env-backed accounts. Kept sync for UI/static use.
export function getAccounts() {
  return baseAccounts()
}

// Returns accounts with runtime token overrides stored by the Vercel OAuth callback.
export async function getAccountsWithStoredTokens() {
  const accounts = baseAccounts()
  return Promise.all(accounts.map(async account => {
    const storedToken = await getStoredToken(account.key)
    return storedToken ? { ...account, token: storedToken } : account
  }))
}

export function getAccountByIgId(igId) {
  return getAccounts().find(a => a.igId === igId)
}

export async function getAccountByIgIdWithStoredToken(igId) {
  const accounts = await getAccountsWithStoredTokens()
  return accounts.find(a => a.igId === igId)
}

export async function resolveAccountForWebhookId(webhookId) {
  if (!webhookId) return null

  const accounts = await getAccountsWithStoredTokens()
  const directMatch = accounts.find(a => a.igId === webhookId || a.pageId === webhookId)
  if (directMatch) return directMatch

  for (const account of accounts) {
    if (!isInstagramLoginToken(account.token)) continue

    try {
      const igAccount = await getInstagramLoginAccount(account.token)
      if (igAccount.id === webhookId || igAccount.user_id === webhookId) {
        return {
          ...account,
          instagramLoginId: igAccount.id,
          instagramUserId: igAccount.user_id,
          username: igAccount.username,
        }
      }
    } catch {
      // Ignore account resolution failures; callers log unresolved webhook IDs.
    }
  }

  return null
}
