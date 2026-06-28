'use client'

import { useEffect, useState } from 'react'
import useActiveWorkspace from '@/components/useActiveWorkspace'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState(null)
  const { activeWorkspace, loadingWorkspaces } = useActiveWorkspace()

  useEffect(() => {
    if (!activeWorkspace?.id) return

    setAccounts(null)
    fetch(`/api/accounts/status?workspaceId=${activeWorkspace.id}`)
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => setError('Could not load account status.'))
  }, [activeWorkspace?.id])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <section>
        <h2>Connected account</h2>
        <p className="hint">
          This connection belongs only to the selected workspace.
          {activeWorkspace ? ` You are setting up ${activeWorkspace.name}. Meta will only show Instagram Business accounts you are allowed to manage and grant during sign-in.` : ''}
        </p>

        {error && <p className="empty-state__sub" style={{ color: 'var(--danger)' }}>{error}</p>}
        {(loadingWorkspaces || (!accounts && !error)) && <p className="loading">Checking account…</p>}

        <div className="account-status-list">
          {accounts?.map(acc => (
            <div key={acc.key} className="account-status-card">
              <div className="account-status-info">
                <span className="account-status-name">
                  {acc.connected ? acc.name : `${activeWorkspace?.name || 'Workspace'} is not connected`}
                </span>
                {acc.igId && (
                  <span className="account-status-error">Instagram ID: {acc.igId}</span>
                )}
                <span className={`badge ${acc.valid ? 'badge-ok' : 'badge-bad'}`}>
                  {acc.valid ? 'Connected' : 'Not connected'}
                </span>
                {!acc.valid && acc.error && (
                  <span className="account-status-error">{acc.error}</span>
                )}
              </div>
              <a
                className="btn-primary"
                href={`/auth/meta/start?workspace=${activeWorkspace?.id || acc.workspaceId}`}
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
