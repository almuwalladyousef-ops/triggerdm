'use client'

import { useCallback, useEffect, useState } from 'react'
import useActiveWorkspace from '@/components/useActiveWorkspace'
import { openInBrowser } from '@/lib/desktop'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState(null)
  const { activeWorkspace, loadingWorkspaces } = useActiveWorkspace()

  const refresh = useCallback(() => {
    if (!activeWorkspace?.id) return
    fetch(`/api/accounts/status?workspaceId=${activeWorkspace.id}`)
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => setError('Could not load account status.'))
  }, [activeWorkspace?.id])

  useEffect(() => {
    if (!activeWorkspace?.id) return
    setAccounts(null)
    refresh()
  }, [activeWorkspace?.id, refresh])

  // When connecting opens Chrome, the webview keeps showing the old status.
  // Re-check whenever the user returns to the app so the badge updates.
  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const startConnect = (path) => (e) => {
    // Inside the Content OS desktop view, pop OAuth into the user's real Chrome
    // (saved passwords) instead of navigating the webview. On the web, this is a
    // no-op and the normal link navigation proceeds.
    if (openInBrowser(path)) e.preventDefault()
  }

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
                onClick={startConnect(`/auth/meta/start?workspace=${activeWorkspace?.id || acc.workspaceId}`)}
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
