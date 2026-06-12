import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Slideshow } from '../types/slideshow'
import { StageFrame } from '../player/StageFrame'
import { totalDuration } from '../player/timeline'

/**
 * Headless render surface for scripts/render-video.mjs. Mounted instead of
 * the editor when the URL has ?render. The driving script loads a document
 * and steps time frame by frame:
 *
 *   window.__loadDoc(json)  -> { total, width, height }
 *   window.__renderAt(ms)   -> renders that exact frame synchronously
 */
declare global {
  interface Window {
    __loadDoc: (doc: Slideshow) => { total: number; width: number; height: number }
    __renderAt: (t: number) => void
  }
}

export function RenderHarness() {
  const [doc, setDoc] = useState<Slideshow | null>(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    window.__loadDoc = (next) => {
      flushSync(() => {
        setDoc(next)
        setT(0)
      })
      return {
        total: totalDuration(next),
        width: next.settings.width,
        height: next.settings.height,
      }
    }
    window.__renderAt = (ms) => {
      flushSync(() => setT(ms))
    }
  }, [])

  if (!doc) return <div id="render-waiting" />

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: doc.settings.width,
        height: doc.settings.height,
        background: '#000',
      }}
    >
      <StageFrame doc={doc} t={t} />
    </div>
  )
}
