'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MessageBuilder from './MessageBuilder'
import ReelPicker from './ReelPicker'

export default function RuleEditor({ initial }) {
  const router = useRouter()
  const isNew = !initial?.id

  const [accounts, setAccounts] = useState([])
  const [allRules, setAllRules] = useState([])
  const [rule, setRule] = useState(initial || {
    name: '',
    active: true,
    igId: null,
    applyToAll: false,
    targetReels: [],
    keywords: [],
    matchMode: 'any',
    exactMatch: false,
    negativeKeywords: [],
    anyComment: false,
    dmKeywords: [],
    perKeywordMessages: {},
    messages: [],
    twoStep: false,
    twoStepPrompt: '',
    twoStepButtonText: 'Send me!',
    fallbackMessage: '',
    commentReply: 'Sent you a DM.',
    sendCap: '',
    retriggerDays: '',
    startDate: '',
    endDate: '',
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [negKwInput, setNegKwInput] = useState('')
  const [dmKwInput, setDmKwInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testUserId, setTestUserId] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/rules').then(r => r.json()),
    ]).then(([accs, rls]) => {
      setAccounts(accs)
      setAllRules(rls)
      if (isNew && accs.length > 0 && !rule.igId) {
        setRule(r => ({ ...r, igId: accs[0].igId }))
      }
    }).catch(() => {})
  }, [])

  // Overlap warning: other active rules targeting same reels with overlapping keywords
  const overlaps = allRules.filter(r => {
    if (r.id === rule.id || !r.active) return false
    if (r.igId !== rule.igId) return false
    const reelOverlap = r.applyToAll || rule.applyToAll || r.targetReels?.some(id => rule.targetReels?.includes(id))
    if (!reelOverlap) return false
    return rule.keywords.some(kw => r.keywords?.includes(kw))
  })

  function set(key, val) { setRule(r => ({ ...r, [key]: val })) }

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase()
    if (!kw || rule.keywords.includes(kw)) return
    set('keywords', [...rule.keywords, kw])
    setKeywordInput('')
  }

  function addNegKeyword() {
    const kw = negKwInput.trim().toLowerCase()
    if (!kw || (rule.negativeKeywords || []).includes(kw)) return
    set('negativeKeywords', [...(rule.negativeKeywords || []), kw])
    setNegKwInput('')
  }

  function addDmKeyword() {
    const kw = dmKwInput.trim().toLowerCase()
    if (!kw || (rule.dmKeywords || []).includes(kw)) return
    set('dmKeywords', [...(rule.dmKeywords || []), kw])
    setDmKwInput('')
  }

  function selectAccount(igId) {
    setRule(r => ({ ...r, igId, targetReels: [], applyToAll: false }))
  }

  async function save() {
    if (!rule.name) return setError('Give this rule a name.')
    if (!rule.igId) return setError('Select an account.')
    if (!rule.anyComment && rule.keywords.length === 0 && !rule.dmKeywords?.length) {
      return setError('Add at least one keyword, enable "Any comment", or add DM keywords.')
    }
    if (rule.messages.length === 0) return setError('Add at least one message.')
    if (!rule.applyToAll && rule.targetReels.length === 0 && !rule.dmKeywords?.length) {
      return setError('Select at least one reel, enable Apply to all, or add DM keywords.')
    }

    setSaving(true)
    setError('')

    const payload = {
      ...rule,
      sendCap: rule.sendCap ? Number(rule.sendCap) : null,
      retriggerDays: rule.retriggerDays ? Number(rule.retriggerDays) : null,
      startDate: rule.startDate || null,
      endDate: rule.endDate || null,
    }

    const method = isNew ? 'POST' : 'PUT'
    const url = isNew ? '/api/rules' : `/api/rules/${rule.id}`

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/rules')
    } else {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  async function deleteRule() {
    if (!confirm(`Delete "${rule.name}"? This cannot be undone.`)) return
    await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' })
    router.push('/rules')
  }

  async function cloneRule() {
    setCloning(true)
    const res = await fetch(`/api/rules?action=duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: rule.id }),
    })
    if (res.ok) {
      router.push('/rules')
    } else {
      setCloning(false)
    }
  }

  async function resetLog() {
    if (!confirm('Clear the DM history for this rule? Everyone who was DMed can be DMed again.')) return
    setResetting(true)
    await fetch(`/api/rules/${rule.id}?action=reset-log`, { method: 'POST' })
    setResetting(false)
    alert('DM history cleared.')
  }

  async function testSend() {
    if (!testUserId.trim()) return setTestResult({ error: 'Enter an Instagram user ID.' })
    setTestSending(true)
    setTestResult(null)
    const res = await fetch(`/api/rules/${rule.id}?action=test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId.trim() }),
    })
    const data = await res.json()
    setTestResult(res.ok ? { success: true } : { error: data.error })
    setTestSending(false)
  }

  const selectedAccount = accounts.find(a => a.igId === rule.igId)

  return (
    <div className="rule-editor">
      <div className="editor-header">
        <input
          className="rule-name-input"
          placeholder="Rule name (e.g. Summer sale)"
          value={rule.name}
          onChange={e => set('name', e.target.value)}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={rule.active}
            onChange={e => set('active', e.target.checked)}
          />
          Active
        </label>
      </div>

      {/* Meta */}
      {!isNew && (
        <div className="editor-meta">
          {rule.createdAt && <span>Created {new Date(rule.createdAt).toLocaleDateString()}</span>}
          {rule.updatedAt && <span>· Updated {new Date(rule.updatedAt).toLocaleDateString()}</span>}
        </div>
      )}

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

      {/* Keyword triggers */}
      <section>
        <h3>1. Comment Triggers</h3>
        <p className="hint">When to send the DM based on comment content.</p>

        <label className="toggle" style={{ marginBottom: '16px' }}>
          <input type="checkbox" checked={rule.anyComment} onChange={e => set('anyComment', e.target.checked)} />
          Trigger on <strong>any comment</strong> (no keyword needed)
        </label>

        {!rule.anyComment && (
          <>
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
                  <button onClick={() => set('keywords', rule.keywords.filter(k => k !== kw))}>✕</button>
                </span>
              ))}
            </div>

            {rule.keywords.length > 1 && (
              <div className="match-mode-row">
                <span className="hint" style={{ marginBottom: 0 }}>Match mode:</span>
                <label className="toggle">
                  <input type="radio" name="matchMode" checked={rule.matchMode !== 'all'} onChange={() => set('matchMode', 'any')} />
                  Any keyword
                </label>
                <label className="toggle">
                  <input type="radio" name="matchMode" checked={rule.matchMode === 'all'} onChange={() => set('matchMode', 'all')} />
                  All keywords
                </label>
              </div>
            )}

            <label className="toggle" style={{ marginTop: '12px' }}>
              <input type="checkbox" checked={rule.exactMatch} onChange={e => set('exactMatch', e.target.checked)} />
              Exact word match (won't trigger on "linking" for keyword "link")
            </label>

            <div style={{ marginTop: '16px' }}>
              <p className="hint">Negative keywords — block trigger if comment contains these:</p>
              <div className="keyword-input-row">
                <input
                  placeholder="e.g. spam"
                  value={negKwInput}
                  onChange={e => setNegKwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNegKeyword()}
                />
                <button onClick={addNegKeyword}>Add</button>
              </div>
              <div className="keyword-tags">
                {(rule.negativeKeywords || []).map(kw => (
                  <span key={kw} className="tag tag--negative">
                    {kw}
                    <button onClick={() => set('negativeKeywords', (rule.negativeKeywords || []).filter(k => k !== kw))}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {overlaps.length > 0 && (
          <div className="overlap-warning">
            ⚠ Keyword overlap with: {overlaps.map(r => <strong key={r.id}>{r.name}</strong>).reduce((a, b) => [a, ', ', b])}. Both rules may fire on the same comment.
          </div>
        )}
      </section>

      {/* DM keyword triggers */}
      <section>
        <h3>2. DM Keyword Triggers (optional)</h3>
        <p className="hint">Also trigger this rule when someone DMs you one of these words directly.</p>
        <div className="keyword-input-row">
          <input
            placeholder="e.g. price"
            value={dmKwInput}
            onChange={e => setDmKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDmKeyword()}
          />
          <button onClick={addDmKeyword}>Add</button>
        </div>
        <div className="keyword-tags">
          {(rule.dmKeywords || []).map(kw => (
            <span key={kw} className="tag tag--dm">
              {kw}
              <button onClick={() => set('dmKeywords', (rule.dmKeywords || []).filter(k => k !== kw))}>✕</button>
            </span>
          ))}
        </div>
      </section>

      {/* DM message */}
      <section>
        <h3>3. DM Message</h3>
        <p className="hint">The message sent to the commenter. Use {`{{first_name}}`} to personalize.</p>
        <MessageBuilder
          messages={rule.messages}
          onChange={messages => set('messages', messages)}
        />
      </section>

      {/* Two-step opt-in */}
      <section>
        <h3>4. Two-Step Opt-In</h3>
        <p className="hint">Send a teaser first. They tap a button to get the actual message.</p>
        <label className="toggle" style={{ marginBottom: '16px' }}>
          <input type="checkbox" checked={rule.twoStep} onChange={e => set('twoStep', e.target.checked)} />
          Enable two-step opt-in
        </label>
        {rule.twoStep && (
          <div className="two-step-fields">
            <label className="field-label">Teaser message (step 1)</label>
            <textarea
              placeholder="e.g. Hey! Want me to send you the link? Tap below 👇"
              value={rule.twoStepPrompt}
              onChange={e => set('twoStepPrompt', e.target.value)}
              rows={2}
            />
            <label className="field-label" style={{ marginTop: '12px' }}>Button label</label>
            <input
              type="text"
              placeholder="Send me!"
              value={rule.twoStepButtonText}
              onChange={e => set('twoStepButtonText', e.target.value)}
            />
            <p className="hint" style={{ marginTop: '8px' }}>The DM Message above (step 3) is sent after they tap the button.</p>
          </div>
        )}
      </section>

      {/* Comment reply */}
      <section>
        <h3>5. Comment Reply</h3>
        <p className="hint">Public reply posted under the matching comment after the DM is sent.</p>
        <textarea
          placeholder="Sent you a DM."
          value={rule.commentReply || ''}
          onChange={e => set('commentReply', e.target.value)}
          rows={2}
        />
      </section>

      {/* Target reels */}
      <section>
        <h3>6. Target Reels</h3>
        <p className="hint">
          {selectedAccount ? `Reels from ${selectedAccount.name}.` : 'Select an account first.'}
        </p>
        <ReelPicker
          igId={rule.igId}
          selected={rule.targetReels}
          applyToAll={rule.applyToAll}
          onChange={({ targetReels, applyToAll }) => setRule(r => ({ ...r, targetReels, applyToAll }))}
        />
      </section>

      {/* Controls */}
      <section>
        <h3>7. Controls</h3>
        <div className="controls-grid">
          <div className="control-group">
            <label className="field-label">Daily send cap</label>
            <p className="hint">Max DMs this rule sends per day (leave blank = unlimited).</p>
            <input
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={rule.sendCap || ''}
              onChange={e => set('sendCap', e.target.value)}
            />
          </div>
          <div className="control-group">
            <label className="field-label">Re-trigger after (days)</label>
            <p className="hint">Allow the same person to get this DM again after N days. Leave blank = never re-trigger.</p>
            <input
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={rule.retriggerDays || ''}
              onChange={e => set('retriggerDays', e.target.value)}
            />
          </div>
          <div className="control-group">
            <label className="field-label">Start date</label>
            <p className="hint">Rule won't fire before this date.</p>
            <input
              type="date"
              value={rule.startDate || ''}
              onChange={e => set('startDate', e.target.value)}
            />
          </div>
          <div className="control-group">
            <label className="field-label">End / expiry date</label>
            <p className="hint">Rule auto-stops firing after this date.</p>
            <input
              type="date"
              value={rule.endDate || ''}
              onChange={e => set('endDate', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Test send */}
      {!isNew && (
        <section>
          <h3>Test Send</h3>
          <p className="hint">Send a test DM to your own Instagram user ID to preview the message.</p>
          <div className="keyword-input-row">
            <input
              placeholder="Your Instagram user ID"
              value={testUserId}
              onChange={e => setTestUserId(e.target.value)}
            />
            <button onClick={testSend} disabled={testSending}>
              {testSending ? 'Sending…' : 'Send test'}
            </button>
          </div>
          {testResult?.success && <p className="success-msg">DM sent! Check your inbox.</p>}
          {testResult?.error && <p className="error">{testResult.error}</p>}
        </section>
      )}

      {error && <p className="error">{error}</p>}

      <div className="editor-actions">
        <button className="btn-save" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Rule'}
        </button>
        {!isNew && (
          <>
            <button className="btn-clone" onClick={cloneRule} disabled={cloning}>
              {cloning ? 'Cloning…' : 'Duplicate'}
            </button>
            <button className="btn-reset" onClick={resetLog} disabled={resetting}>
              {resetting ? 'Clearing…' : 'Reset DM History'}
            </button>
            <button className="btn-delete" onClick={deleteRule}>Delete</button>
          </>
        )}
        <button className="btn-cancel" onClick={() => router.push('/rules')}>Cancel</button>
      </div>
    </div>
  )
}
