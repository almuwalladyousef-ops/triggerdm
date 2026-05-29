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
    return { rules: [], dmedLog: {}, tokenLog: [] }
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

export async function saveRule(rule) {
  const db = await readDB()
  const idx = (db.rules || []).findIndex(r => r.id === rule.id)
  if (idx >= 0) {
    db.rules[idx] = rule
  } else {
    db.rules = [...(db.rules || []), rule]
  }
  await writeDB(db)
}

export async function deleteRule(id) {
  const db = await readDB()
  db.rules = (db.rules || []).filter(r => r.id !== id)
  await writeDB(db)
}

export async function deleteRules(ids) {
  const idSet = new Set(ids)
  const db = await readDB()
  db.rules = (db.rules || []).filter(r => !idSet.has(r.id))
  await writeDB(db)
}

export async function hasBeenDMed(ruleId, userId) {
  const db = await readDB()
  return !!db.dmedLog?.[`${ruleId}:${userId}`]
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

export async function getStats() {
  const db = await readDB()
  return {
    totalRules: (db.rules || []).length,
    activeRules: (db.rules || []).filter(r => r.active).length,
    totalDMs: Object.keys(db.dmedLog || {}).length,
  }
}
