'use client'
import { useEffect, useState } from 'react'

export default function ReelPicker({ selected, applyToAll, onChange }) {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reels')
      .then(r => r.json())
      .then(data => { setReels(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function toggle(reelId) {
    const next = selected.includes(reelId)
      ? selected.filter(id => id !== reelId)
      : [...selected, reelId]
    onChange({ targetReels: next, applyToAll: false })
  }

  return (
    <div className="reel-picker">
      <label className="apply-all">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={e => onChange({ targetReels: [], applyToAll: e.target.checked })}
        />
        Apply to all reels (current and future)
      </label>

      {!applyToAll && (
        <>
          {loading && <p className="loading">Loading reels…</p>}
          {!loading && reels.length === 0 && (
            <p className="empty">No reels found. Make sure your PAGE_ACCESS_TOKEN is set.</p>
          )}
          <div className="reel-grid">
            {reels.map(reel => (
              <div
                key={reel.id}
                className={`reel-card ${selected.includes(reel.id) ? 'selected' : ''}`}
                onClick={() => toggle(reel.id)}
              >
                {reel.thumbnail_url ? (
                  <img src={reel.thumbnail_url} alt={reel.caption || 'Reel'} />
                ) : (
                  <div className="reel-placeholder">▶</div>
                )}
                <p className="reel-caption">{reel.caption?.slice(0, 60) || 'No caption'}</p>
                {selected.includes(reel.id) && <div className="reel-check">✓</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
