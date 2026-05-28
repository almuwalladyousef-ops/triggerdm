'use client'
import { useState } from 'react'

export default function MessageBuilder({ messages, onChange }) {
  const [blocks, setBlocks] = useState(messages || [])

  function update(newBlocks) {
    setBlocks(newBlocks)
    onChange(newBlocks)
  }

  function addBlock(type) {
    const block = type === 'text'
      ? { type: 'text', content: '' }
      : { type: 'link', url: '' }
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

  return (
    <div className="message-builder">
      <div className="blocks">
        {blocks.map((block, i) => (
          <div key={i} className="block">
            <div className="block-controls">
              <button onClick={() => moveBlock(i, -1)} disabled={i === 0}>↑</button>
              <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>↓</button>
              <button className="remove" onClick={() => removeBlock(i)}>✕</button>
            </div>

            {block.type === 'text' ? (
              <textarea
                placeholder="Type your message..."
                value={block.content}
                onChange={e => updateBlock(i, 'content', e.target.value)}
                rows={3}
              />
            ) : (
              <input
                type="url"
                placeholder="https://your-link.com"
                value={block.url}
                onChange={e => updateBlock(i, 'url', e.target.value)}
              />
            )}

            <span className="block-type">{block.type === 'text' ? 'Message' : 'Link'}</span>
          </div>
        ))}
      </div>

      <div className="add-buttons">
        <button onClick={() => addBlock('text')}>+ Add Message</button>
        <button onClick={() => addBlock('link')}>+ Add Link</button>
      </div>

      {blocks.length > 0 && (
        <div className="preview">
          <p className="preview-label">Preview</p>
          {blocks.map((b, i) => (
            <div key={i} className="preview-block">
              {b.type === 'text' ? (b.content || '…') : (
                <a href={b.url} target="_blank" rel="noopener noreferrer">{b.url || 'Link'}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
