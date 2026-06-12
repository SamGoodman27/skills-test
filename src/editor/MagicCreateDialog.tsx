import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { aiMagicPlan } from '../ai/client'
import { buildShow, fallbackPlan } from '../lib/magic'
import type { MagicMedia } from '../lib/magic'
import type { Consistency } from '../lib/autodesign'
import { readFileAsDataURL, uid } from '../lib/util'

const CONSISTENCY: { value: Consistency; label: string }[] = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'varied', label: 'Varied' },
  { value: 'random', label: 'Random' },
]

/**
 * Magic Create: media in, finished slideshow out. With the AI service
 * running, Claude sequences the photos and writes the words; without it,
 * the deterministic fallback still builds a styled show.
 */
export function MagicCreateDialog({ onClose }: { onClose: () => void }) {
  const doc = useStore((s) => s.doc)
  const loadDoc = useStore((s) => s.loadDoc)
  const [media, setMedia] = useState<MagicMedia[]>([])
  const [vibe, setVibe] = useState('')
  const [consistency, setConsistency] = useState<Consistency>('varied')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const next: MagicMedia[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) continue
      next.push({
        id: uid(),
        src: await readFileAsDataURL(f),
        kind: f.type.startsWith('video/') ? 'video' : 'image',
      })
    }
    setMedia((m) => [...m, ...next])
  }

  const generate = async (useAi: boolean) => {
    setError(null)
    try {
      const images = media.filter((m) => m.kind === 'image')
      let plan
      if (useAi && images.length > 0) {
        setStatus('Analyzing photos & planning the story…')
        const thumbs = await Promise.all(
          images.map(async (m) => ({ id: m.id, data: await thumb(m.src) })),
        )
        plan = await aiMagicPlan(thumbs, vibe)
      } else {
        plan = fallbackPlan(media, vibe)
      }
      setStatus('Building slides…')
      const show = buildShow(plan, media, consistency, {
        width: doc.settings.width,
        height: doc.settings.height,
      })
      if (show.slides.length === 0) throw new Error('the plan produced no slides')
      loadDoc(show)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStatus(null)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Magic Create</div>
        <p className="dialog-hint">
          Drop in your photos (and clips), describe the occasion, and get a
          complete slideshow — sequenced, captioned, and styled. It replaces
          the current project, so save first if it matters.
        </p>

        <div className="panel-title">Media</div>
        <div
          className="dropzone"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void addFiles(e.dataTransfer.files)
          }}
        >
          {media.length === 0
            ? 'Click or drop images / videos here'
            : `${media.length} file${media.length > 1 ? 's' : ''} added`}
          {media.length > 0 && (
            <div className="dropzone-thumbs">
              {media.slice(0, 12).map((m) =>
                m.kind === 'image' ? (
                  <img key={m.id} src={m.src} alt="" />
                ) : (
                  <video key={m.id} src={m.src} muted />
                ),
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => void addFiles(e.target.files)}
        />

        <div className="panel-title">Vibe</div>
        <input
          type="text"
          placeholder="e.g. elegant anniversary · playful birthday · summer road trip"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
        />

        <div className="panel-title">Consistency</div>
        <div className="consistency-row">
          {CONSISTENCY.map((c) => (
            <button
              key={c.value}
              className={`theme-card${c.value === consistency ? ' selected' : ''}`}
              onClick={() => setConsistency(c.value)}
            >
              <span className="theme-name">{c.label}</span>
            </button>
          ))}
        </div>

        {status && <div className="ai-status">{status}</div>}
        {error && <div className="ai-error">{error}</div>}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            disabled={media.length === 0 || status !== null}
            title="Sequence and style without calling the AI service"
            onClick={() => void generate(false)}
          >
            Without AI
          </button>
          <button
            className="btn btn-primary"
            disabled={media.length === 0 || status !== null}
            onClick={() => void generate(true)}
          >
            ✨ Generate
          </button>
        </div>
      </div>
    </div>
  )
}

/** Downscale for the vision call — the model needs the gist, not 4K. */
async function thumb(src: string, maxDim = 768): Promise<string> {
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('could not read an image'))
    img.src = src
  })
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}
