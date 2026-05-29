'use client'
import { useState } from 'react'

const PERSONALIZATION_TOKENS = ['{{first_name}}', '{{name}}', '{{username}}']

export default function MessageBuilder({ messages, onChange }) {
  const [blocks, setBlocks] = useState(messages || [])

  function update(newBlocks) {
    setBlocks(newBlocks)
    onChange(newBlocks)
  }

  function addBlock(type) {
    const block =
      type === 'text' ? { type: 'text', content: '' }
      : type === 'link' ? { type: 'link', url: '' }
      : { type: 'button', label: 'Get the link!', url: '' }
    update([...blocks, block])
  }

  function updateBlock(index, field, value) {
    const next = blocks.map((b, i) => i === index ? { ...b, [field]: value } : b)
    update(next)
  }

  function removeBlock(index) {
    update(blocks.filter((_, i) => i !== index))
  }

  function moveBlock(index, dir) {
    const next = [...blocks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  function insertToken(index, token) {
    const b = blocks[index]
    if (b.type !== 'text') return
    updateBlock(index, 'content', (b.content || '') + token)
  }

  const textBlockCount = blocks.filter(b => b.type === 'text').length
  const hasButton = blocks.some(b => b.type === 'button')

  return (
    <div className="message-builder">
      <div className="blocks">
        {blocks.map((block, i) => (
          <div key={i} className={`block block--${block.type}`}>
            <div className="block-controls">
              <button onClick={() => moveBlock(i, -1)} disabled={i === 0}>↑</button>
              <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>↓</button>
              <span className="block-type-label">
                {block.type === 'text' ? 'Message' : block.type === 'link' ? 'Link' : 'Button'}
              </span>
              <button className="remove" onClick={() => removeBlock(i)}>✕</button>
            </div>

            {block.type === 'text' && (
              <>
                <textarea
                  placeholder="Type your message… use {{first_name}} to personalize"
                  value={block.content}
                  onChange={e => updateBlock(i, 'content', e.target.value)}
                  rows={3}
                />
                <div className="token-chips">
                  {PERSONALIZATION_TOKENS.map(t => (
                    <button
                      key={t}
                      className="token-chip"
                      onClick={() => insertToken(i, t)}
                      title={`Insert ${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {block.type === 'link' && (
              <input
                type="url"
                placeholder="https://your-link.com"
                value={block.url}
                onChange={e => updateBlock(i, 'url', e.target.value)}
              />
            )}

            {block.type === 'button' && (
              <div className="button-block-fields">
                <input
                  type="text"
                  placeholder="Button label (e.g. Get the link!)"
                  value={block.label}
                  onChange={e => updateBlock(i, 'label', e.target.value)}
                />
                <input
                  type="url"
                  placeholder="https://your-link.com"
                  value={block.url}
                  onChange={e => updateBlock(i, 'url', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="add-buttons">
        <button onClick={() => addBlock('text')}>+ Message</button>
        <button onClick={() => addBlock('link')}>+ Link</button>
        {!hasButton && (
          <button onClick={() => addBlock('button')} title="Tappable link button in DM">+ Button</button>
        )}
      </div>

      {blocks.length > 0 && (
        <div className="preview">
          <p className="preview-label">DM Preview</p>
          <p className="preview-note">
            All blocks arrive as one combined message in the DM inbox.
          </p>
          <div className="preview-bubble">
            {blocks.map((b, i) => {
              if (b.type === 'text') return <p key={i}>{b.content || '…'}</p>
              if (b.type === 'link') return <p key={i}><a href={b.url} target="_blank" rel="noopener noreferrer">{b.url || 'link'}</a></p>
              if (b.type === 'button') return (
                <div key={i} className="preview-button">
                  <span>{b.label || 'Button'}</span>
                  {b.url && <span className="preview-button-url">{b.url}</span>}
                </div>
              )
              return null
            })}
          </div>
          {textBlockCount === 0 && (
            <p className="preview-warn">Add at least one message block to set context.</p>
          )}
        </div>
      )}
    </div>
  )
}
