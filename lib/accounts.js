import { getStoredToken } from './driveDB.js'

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
