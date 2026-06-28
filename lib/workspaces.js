import { v4 as uuid } from 'uuid'
import { getDeletedWorkspaceIds, getSavedWorkspaces, saveWorkspace, deleteWorkspace as deleteSavedWorkspace } from './driveDB.js'
import { getAccountsWithStoredTokens } from './accounts.js'

function workspaceForAccount(account) {
  return {
    id: `account-${account.igId}`,
    name: account.name,
    igId: account.igId,
    createdAt: new Date().toISOString(),
  }
}

export async function getWorkspaces() {
  const [saved, deletedIds, accounts] = await Promise.all([
    getSavedWorkspaces(),
    getDeletedWorkspaceIds(),
    getAccountsWithStoredTokens(),
  ])

  const byId = new Map((saved || []).map(w => [w.id, w]))
  const byIgId = new Set((saved || []).map(w => w.igId).filter(Boolean))

  for (const account of accounts) {
    const defaultId = `account-${account.igId}`
    if (deletedIds.includes(defaultId)) continue
    if (!byIgId.has(account.igId)) {
      const workspace = workspaceForAccount(account)
      byId.set(workspace.id, workspace)
      byIgId.add(account.igId)
    }
  }

  return [...byId.values()].map(workspace => {
    const account = accounts.find(a => a.igId === workspace.igId)
    return {
      ...workspace,
      accountName: account?.name || null,
      connected: !!account,
    }
  })
}

export async function createWorkspace({ name, igId }) {
  const accounts = await getAccountsWithStoredTokens()
  const account = accounts.find(a => a.igId === igId) || accounts[0]
  const now = new Date().toISOString()
  return saveWorkspace({
    id: uuid(),
    name: name?.trim() || 'New Workspace',
    igId: account?.igId || null,
    createdAt: now,
  })
}

export async function updateWorkspace(id, fields) {
  const workspaces = await getWorkspaces()
  const existing = workspaces.find(w => w.id === id)
  if (!existing) return null

  return saveWorkspace({
    id,
    name: fields.name?.trim() || existing.name,
    igId: fields.igId || existing.igId,
    createdAt: existing.createdAt,
  })
}

export async function deleteWorkspace(id) {
  await deleteSavedWorkspace(id)
}
