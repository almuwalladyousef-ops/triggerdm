'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MessageBuilder from './MessageBuilder'
import ReelPicker from './ReelPicker'

export default function RuleEditor({ initial }) {
  const router = useRouter()
  const isNew = !initial?.id

  const [accounts, setAccounts] = useState([])
  const [rule, setRule] = useState(initial || {
    name: '',
    active: true,
    igId: null,
    applyToAll: false,
    targetReels: [],
    keywords: [],
    messages: [],
    commentReply: 'Sent you a DM.',
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => {
        setAccounts(data)
        if (isNew && data.length > 0 && !rule.igId) {
          setRule(r => ({ ...r, igId: data[0].igId }))
        }
      })
      .catch(() => {})
  }, [])

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase()
    if (!kw || rule.keywords.includes(kw)) return
    setRule(r => ({ ...r, keywords: [...r.keywords, kw] }))
    setKeywordInput('')
  }

  function removeKeyword(kw) {
    setRule(r => ({ ...r, keywords: r.keywords.filter(k => k !== kw) }))
  }

  function selectAccount(igId) {
    setRule(r => ({ ...r, igId, targetReels: [], applyToAll: false }))
  }

  async function save() {
    if (!rule.name) return setError('Give this rule a name.')
    if (!rule.igId) return setError('Select an account.')
    if (rule.keywords.length === 0) return setError('Add at least one keyword.')
    if (rule.messages.length === 0) return setError('Add at least one message.')
    if (!rule.applyToAll && rule.targetReels.length === 0) return setError('Select at least one reel, or enable Apply to all.')

    setSaving(true)
    setError('')

    const method = isNew ? 'POST' : 'PUT'
    const url = isNew ? '/api/rules' : `/api/rules/${rule.id}`

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })

    if (res.ok) {
      router.push('/rules')
    } else {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  async function deleteRule() {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' })
    router.push('/rules')
  }

  const selectedAccount = accounts.find(a => a.igId === rule.igId)

  return (
    <div className="rule-editor">
      <div className="editor-header">
        <input
          className="rule-name-input"
          placeholder="Rule name (e.g. Summer sale)"
          value={rule.name}
          onChange={e => setRule(r => ({ ...r, name: e.target.value }))}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={rule.active}
            onChange={e => setRule(r => ({ ...r, active: e.target.checked }))}
          />
          Active
        </label>
      </div>

      <section>
        <h3>Account</h3>
        <p className="hint">Which Instagram account this rule belongs to.</p>
        <div className="account-tabs">
          {accounts.map(a => (
            <button
              key={a.igId}
              className={`account-tab ${rule.igId === a.igId ? 'selected' : ''}`}
              onClick={() => selectAccount(a.igId)}
            >
              {a.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>1. Trigger Keywords</h3>
        <p className="hint">DM fires when a comment contains any of these words.</p>
        <div className="keyword-input-row">
          <input
            placeholder="e.g. link"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
          />
          <button onClick={addKeyword}>Add</button>
        </div>
        <div className="keyword-tags">
          {rule.keywords.map(kw => (
            <span key={kw} className="tag">
              {kw}
              <button onClick={() => removeKeyword(kw)}>✕</button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3>2. DM Message</h3>
        <p className="hint">Build the message sequence sent to the commenter.</p>
        <MessageBuilder
          messages={rule.messages}
          onChange={messages => setRule(r => ({ ...r, messages }))}
        />
      </section>

      <section>
        <h3>3. Comment Reply</h3>
        <p className="hint">Public reply posted under the matching comment after the DM is sent.</p>
        <textarea
          placeholder="Sent you a DM."
          value={rule.commentReply || ''}
          onChange={e => setRule(r => ({ ...r, commentReply: e.target.value }))}
          rows={2}
        />
      </section>

      <section>
        <h3>4. Target Reels</h3>
        <p className="hint">
          {selectedAccount ? `Reels from ${selectedAccount.name}.` : 'Select an account first.'}
        </p>
        <ReelPicker
          igId={rule.igId}
          selected={rule.targetReels}
          applyToAll={rule.applyToAll}
          onChange={({ targetReels, applyToAll }) =>
            setRule(r => ({ ...r, targetReels, applyToAll }))
          }
        />
      </section>

      {error && <p className="error">{error}</p>}

      <div className="editor-actions">
        <button className="btn-save" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Rule'}
        </button>
        {!isNew && (
          <button className="btn-delete" onClick={deleteRule}>Delete</button>
        )}
        <button className="btn-cancel" onClick={() => router.push('/rules')}>Cancel</button>
      </div>
    </div>
  )
}
