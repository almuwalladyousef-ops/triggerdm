'use client'

import { useEffect, useState } from 'react'
import { notifyWorkspacesChanged, storeWorkspaceId } from '@/components/WorkspaceSwitcher'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceIgId, setNewWorkspaceIgId] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts/status').then(r => r.json()),
      fetch('/api/workspaces').then(r => r.json()),
    ])
      .then(([accs, wss]) => {
        setAccounts(accs)
        setWorkspaces(wss)
        setNewWorkspaceIgId(accs[0]?.igId || '')
      })
      .catch(() => setError('Could not load account status.'))
  }, [])

  async function createWorkspace() {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWorkspaceName, igId: newWorkspaceIgId }),
    })
    if (!res.ok) return
    const workspace = await res.json()
    setWorkspaces(prev => [...prev, workspace])
    setNewWorkspaceName('')
    storeWorkspaceId(workspace.id)
    notifyWorkspacesChanged()
  }

  async function updateWorkspace(id, fields) {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...fields } : w))
    const res = await fetch('/api/workspaces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    if (res.ok) {
      const workspace = await res.json()
      setWorkspaces(prev => prev.map(w => w.id === id ? workspace : w))
      notifyWorkspacesChanged()
    }
  }

  async function removeWorkspace(id) {
    const workspace = workspaces.find(w => w.id === id)
    if (!workspace || !confirm(`Delete workspace "${workspace.name}"? Rules are not deleted.`)) return
    await fetch('/api/workspaces', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const next = workspaces.filter(w => w.id !== id)
    setWorkspaces(next)
    notifyWorkspacesChanged()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <section>
        <h2 id="workspaces">Workspaces</h2>
        <p className="hint">
          Add workspaces and edit their names. Use the workspace switcher in the sidebar to change the whole app view.
        </p>

        <div className="workspace-manager">
          {workspaces.map(workspace => (
            <div key={workspace.id} className="workspace-row">
              <input
                value={workspace.name}
                onChange={e => setWorkspaces(prev => prev.map(w => w.id === workspace.id ? { ...w, name: e.target.value } : w))}
                onBlur={e => updateWorkspace(workspace.id, { name: e.target.value })}
                aria-label="Workspace name"
              />
              <select
                value={workspace.igId || ''}
                onChange={e => updateWorkspace(workspace.id, { igId: e.target.value })}
                aria-label="Connected account"
              >
                {accounts?.map(acc => (
                  <option key={acc.igId} value={acc.igId}>{acc.name}</option>
                ))}
              </select>
              <button type="button" className="btn-delete" onClick={() => removeWorkspace(workspace.id)}>
                Delete
              </button>
            </div>
          ))}

          <div className="workspace-row workspace-row--new">
            <input
              placeholder="New workspace name"
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
            />
            <select
              value={newWorkspaceIgId}
              onChange={e => setNewWorkspaceIgId(e.target.value)}
              disabled={!accounts?.length}
            >
              {accounts?.map(acc => (
                <option key={acc.igId} value={acc.igId}>{acc.name}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={createWorkspace} disabled={!accounts?.length}>
              Add Workspace
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2>Connected accounts</h2>
        <p className="hint">
          Instagram automation runs through Meta Page tokens. These tokens expire — when one does,
          its account stops sending. Reconnect to mint a fresh token.
        </p>

        {error && <p className="empty-state__sub" style={{ color: 'var(--danger)' }}>{error}</p>}
        {!accounts && !error && <p className="loading">Checking accounts…</p>}

        <div className="account-status-list">
          {accounts?.map(acc => (
            <div key={acc.igId} className="account-status-card">
              <div className="account-status-info">
                <span className="account-status-name">{acc.name}</span>
                <span className={`badge ${acc.valid ? 'badge-ok' : 'badge-bad'}`}>
                  {acc.valid ? 'Connected' : 'Token expired / invalid'}
                </span>
                {!acc.valid && acc.error && (
                  <span className="account-status-error">{acc.error}</span>
                )}
              </div>
              <a
                className="btn-primary"
                href={`/auth/meta/start?account=${acc.key}`}
              >
                {acc.valid ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
