'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MessageBuilder from './MessageBuilder'
import ReelPicker from './ReelPicker'

export default function RuleEditor({ initial }) {
  const router = useRouter()
  const isNew = !initial?.id

  const [rule, setRule] = useState(initial || {
    name: '',
    active: true,
    applyToAll: false,
    targetReels: [],
    keywords: [],
    messages: [],
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase()
    if (!kw || rule.keywords.includes(kw)) return
    setRule(r => ({ ...r, keywords: [...r.keywords, kw] }))
    setKeywordInput('')
  }

  function removeKeyword(kw) {
    setRule(r => ({ ...r, keywords: r.keywords.filter(k => k !== kw) }))
  }

  async function save() {
    if (!rule.name) return setError('Give this rule a name.')
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
        <h3>3. Target Reels</h3>
        <p className="hint">Choose which reels this rule watches.</p>
        <ReelPicker
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
