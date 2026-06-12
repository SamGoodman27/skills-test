import { useState } from 'react'
import { useStore } from '../state/store'
import { autoDesign, THEMES } from '../lib/autodesign'
import type { Consistency } from '../lib/autodesign'

const CONSISTENCY: { value: Consistency; label: string; hint: string }[] = [
  { value: 'uniform', label: 'Uniform', hint: 'One look, identical on every slide' },
  { value: 'varied', label: 'Varied', hint: 'A small curated mix, still cohesive' },
  { value: 'random', label: 'Random', hint: 'Full mix, tilt and ornaments scattered' },
]

/**
 * Non-AI auto-design: applies a theme's curated pools across the whole show.
 * Every application is one undo step, and "Shuffle" re-rolls the seed.
 */
export function AutoDesignDialog({ onClose }: { onClose: () => void }) {
  const mutate = useStore((s) => s.mutate)
  const [themeId, setThemeId] = useState(THEMES[0].id)
  const [consistency, setConsistency] = useState<Consistency>('varied')

  const apply = () => {
    const seed = Math.floor(Math.random() * 2 ** 31)
    mutate((doc) => autoDesign(doc, themeId, consistency, seed))
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Auto-design</div>
        <p className="dialog-hint">
          Restyles every slide — fonts, colors, backgrounds, transitions, and
          animations — from a theme. Your layout and content stay put, and one
          Undo brings everything back.
        </p>

        <div className="panel-title">Theme</div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-card${t.id === themeId ? ' selected' : ''}`}
              onClick={() => setThemeId(t.id)}
            >
              <span className="theme-name">{t.name}</span>
              <span className="theme-desc">{t.description}</span>
            </button>
          ))}
        </div>

        <div className="panel-title">Consistency</div>
        <div className="consistency-row">
          {CONSISTENCY.map((c) => (
            <button
              key={c.value}
              className={`theme-card${c.value === consistency ? ' selected' : ''}`}
              onClick={() => setConsistency(c.value)}
            >
              <span className="theme-name">{c.label}</span>
              <span className="theme-desc">{c.hint}</span>
            </button>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn" onClick={apply}>
            Shuffle again
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              apply()
              onClose()
            }}
          >
            Apply design
          </button>
        </div>
      </div>
    </div>
  )
}
