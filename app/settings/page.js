'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/accounts/status')
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => setError('Could not load account status.'))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

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
                href={`${acc.authType === 'instagram' ? '/auth/instagram/start' : '/auth/meta/start'}?account=${acc.key}`}
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
