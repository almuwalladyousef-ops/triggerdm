// Returns the config for all connected accounts
export function getAccounts() {
  return [
    {
      name: 'Personal (Yousef)',
      igId: process.env.PERSONAL_IG_ID,
      pageId: process.env.PERSONAL_PAGE_ID,
      token: process.env.PERSONAL_PAGE_TOKEN,
      appSecret: process.env.PERSONAL_APP_SECRET,
    },
    {
      name: 'Business (Traceback)',
      igId: process.env.BUSINESS_IG_ID,
      pageId: process.env.BUSINESS_PAGE_ID,
      token: process.env.BUSINESS_PAGE_TOKEN,
      appSecret: process.env.BUSINESS_APP_SECRET,
    },
  ].filter(a => a.igId && a.token)
}

// Find account config by Instagram account ID
export function getAccountByIgId(igId) {
  return getAccounts().find(a => a.igId === igId)
}
