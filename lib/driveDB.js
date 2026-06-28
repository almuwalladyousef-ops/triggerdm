import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive']

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  })
}

export async function readDB() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const res = await drive.files.get(
    { fileId: process.env.GOOGLE_DRIVE_FILE_ID, alt: 'media' },
    { responseType: 'text' }
  )

  try {
    return JSON.parse(res.data)
  } catch {
    return { rules: [], workspaces: [], dmedLog: {}, tokenLog: [], twoStepPending: {}, sendCapLog: {} }
  }
}

export async function writeDB(data) {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  await drive.files.update({
    fileId: process.env.GOOGLE_DRIVE_FILE_ID,
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(data, null, 2),
    },
  })
}

export async function getRules() {
  const db = await readDB()
  return db.rules || []
}

export async function getSavedWorkspaces() {
  const db = await readDB()
  return db.workspaces || []
}

export async function getDeletedWorkspaceIds() {
  const db = await readDB()
  return db.deletedWorkspaceIds || []
}

export async function saveWorkspace(workspace) {
  const db = await readDB()
  const now = new Date().toISOString()
  const withTimestamp = { ...workspace, updatedAt: now }
  const idx = (db.workspaces || []).findIndex(w => w.id === workspace.id)
  if (idx >= 0) {
    db.workspaces[idx] = { ...(db.workspaces[idx] || {}), ...withTimestamp }
  } else {
    db.workspaces = [...(db.workspaces || []), { ...withTimestamp, createdAt: workspace.createdAt || now }]
  }
  db.deletedWorkspaceIds = (db.deletedWorkspaceIds || []).filter(deletedId => deletedId !== workspace.id)
  await writeDB(db)
  return idx >= 0 ? db.workspaces[idx] : db.workspaces[db.workspaces.length - 1]
}

export async function deleteWorkspace(id) {
  const db = await readDB()
  db.workspaces = (db.workspaces || []).filter(w => w.id !== id)
  db.deletedWorkspaceIds = [...new Set([...(db.deletedWorkspaceIds || []), id])]
  await writeDB(db)
}

export async function saveRule(rule) {
  const db = await readDB()
  const now = new Date().toISOString()
  const withTimestamp = { ...rule, updatedAt: now }
  const idx = (db.rules || []).findIndex(r => r.id === rule.id)
  if (idx >= 0) {
    db.rules[idx] = withTimestamp
  } else {
    db.rules = [...(db.rules || []), withTimestamp]
  }
  await writeDB(db)
  return withTimestamp
}

export async function deleteRule(id) {
  const db = await readDB()
  db.rules = (db.rules || []).filter(r => r.id !== id)
  if (db.dmedLog) {
    for (const key of Object.keys(db.dmedLog)) {
      if (key.startsWith(`${id}:`)) delete db.dmedLog[key]
    }
  }
  if (db.twoStepPending) {
    for (const key of Object.keys(db.twoStepPending)) {
      if (key.startsWith(`${id}:`)) delete db.twoStepPending[key]
    }
  }
  await writeDB(db)
}

export async function deleteRules(ids) {
  const idSet = new Set(ids)
  const db = await readDB()
  db.rules = (db.rules || []).filter(r => !idSet.has(r.id))
  if (db.dmedLog) {
    for (const key of Object.keys(db.dmedLog)) {
      if (idSet.has(key.split(':')[0])) delete db.dmedLog[key]
    }
  }
  await writeDB(db)
}

export async function bulkUpdateRules(ids, fields) {
  const idSet = new Set(ids)
  const db = await readDB()
  const now = new Date().toISOString()
  db.rules = (db.rules || []).map(r =>
    idSet.has(r.id) ? { ...r, ...fields, updatedAt: now } : r
  )
  await writeDB(db)
}

export async function resetRuleDmedLog(ruleId) {
  const db = await readDB()
  if (db.dmedLog) {
    for (const key of Object.keys(db.dmedLog)) {
      if (key.startsWith(`${ruleId}:`)) delete db.dmedLog[key]
    }
  }
  await writeDB(db)
}

export async function hasBeenDMed(ruleId, userId, retriggerDays = null) {
  const db = await readDB()
  const key = `${ruleId}:${userId}`
  const ts = db.dmedLog?.[key]
  if (!ts) return false
  if (retriggerDays != null) {
    const daysSince = (Date.now() - new Date(ts).getTime()) / 86400000
    return daysSince < retriggerDays
  }
  return true
}

export async function logDM(ruleId, userId) {
  const db = await readDB()
  db.dmedLog = db.dmedLog || {}
  db.dmedLog[`${ruleId}:${userId}`] = new Date().toISOString()
  await writeDB(db)
}

export async function logToken(token, expiryDate) {
  const db = await readDB()
  db.tokenLog = db.tokenLog || []
  db.tokenLog.push({ token, expiryDate, refreshedAt: new Date().toISOString() })
  await writeDB(db)
}

export async function saveStoredToken(key, token, meta = {}) {
  const db = await readDB()
  db.storedTokens = db.storedTokens || {}
  db.storedTokens[key] = {
    token,
    meta,
    updatedAt: new Date().toISOString(),
  }
  await writeDB(db)
}

export async function getStoredToken(key) {
  const db = await readDB()
  return db.storedTokens?.[key]?.token || null
}

export async function getStoredTokenRecord(key) {
  const db = await readDB()
  return db.storedTokens?.[key] || null
}

// Two-step opt-in: store pending state until user taps button / replies
export async function setPendingTwoStep(ruleId, userId, data) {
  const db = await readDB()
  db.twoStepPending = db.twoStepPending || {}
  db.twoStepPending[`${ruleId}:${userId}`] = { ...data, createdAt: new Date().toISOString() }
  await writeDB(db)
}

export async function getPendingTwoStepForUser(userId) {
  const db = await readDB()
  const pending = db.twoStepPending || {}
  for (const [key, val] of Object.entries(pending)) {
    if (key.endsWith(`:${userId}`)) {
      return { key, ruleId: key.split(':')[0], ...val }
    }
  }
  return null
}

export async function clearPendingTwoStep(ruleId, userId) {
  const db = await readDB()
  if (db.twoStepPending) delete db.twoStepPending[`${ruleId}:${userId}`]
  await writeDB(db)
}

// Send cap: check and increment daily DM count per rule
export async function checkAndIncrementSendCap(ruleId, cap) {
  if (!cap) return true
  const db = await readDB()
  db.sendCapLog = db.sendCapLog || {}
  const today = new Date().toISOString().slice(0, 10)
  const key = `${ruleId}:${today}`
  const count = db.sendCapLog[key] || 0
  if (count >= cap) return false
  db.sendCapLog[key] = count + 1
  await writeDB(db)
  return true
}

export async function getStats() {
  const db = await readDB()
  return {
    totalRules: (db.rules || []).length,
    activeRules: (db.rules || []).filter(r => r.active).length,
    totalDMs: Object.keys(db.dmedLog || {}).length,
  }
}

export async function getPerRuleStats() {
  const db = await readDB()
  const perRule = {}
  for (const [key, ts] of Object.entries(db.dmedLog || {})) {
    const ruleId = key.split(':')[0]
    if (!perRule[ruleId]) perRule[ruleId] = { count: 0, lastAt: null }
    perRule[ruleId].count++
    if (!perRule[ruleId].lastAt || ts > perRule[ruleId].lastAt) {
      perRule[ruleId].lastAt = ts
    }
  }
  return perRule
}

export async function get7DayStats(ruleIds = null) {
  const db = await readDB()
  const ruleIdSet = ruleIds ? new Set(ruleIds) : null
  const daily = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    daily[d] = 0
  }
  const cutoff = Object.keys(daily)[0]
  for (const [key, ts] of Object.entries(db.dmedLog || {})) {
    if (ruleIdSet && !ruleIdSet.has(key.split(':')[0])) continue
    if (ts >= cutoff) {
      const day = ts.slice(0, 10)
      if (day in daily) daily[day]++
    }
  }
  return daily
}

export async function getTokenStatus() {
  const db = await readDB()
  const log = db.tokenLog || []
  if (!log.length) return null
  const latest = log[log.length - 1]
  return {
    expiryDate: latest.expiryDate,
    refreshedAt: latest.refreshedAt,
    daysUntilExpiry: latest.expiryDate
      ? Math.ceil((new Date(latest.expiryDate) - Date.now()) / 86400000)
      : null,
  }
}

export async function logWebhookEvent(event) {
  const db = await readDB()
  db.webhookLog = db.webhookLog || []
  db.webhookLog.unshift({ ...event, at: new Date().toISOString() })
  if (db.webhookLog.length > 200) db.webhookLog = db.webhookLog.slice(0, 200)
  await writeDB(db)
}

export async function getWebhookLog() {
  const db = await readDB()
  return db.webhookLog || []
}
