import { useState } from 'react'
import { useStore } from '../state/store'
import type { ImageElement, SlideElement, TextElement } from '../types/slideshow'
import { aiEditImage, aiRestyleText, aiRewriteText } from '../ai/client'
import type { StylePatch } from '../ai/client'

const COPY_ACTIONS = ['Shorter', 'Punchier', 'More poetic', 'Fix grammar']
const STYLE_ACTIONS = ['Elegant serif', 'Bold & modern', 'Soft handwritten', 'High contrast']
const IMAGE_ACTIONS = ['Warmer light', 'Black & white', 'Watercolor style', 'Remove background clutter']

type Proposal =
  | { kind: 'copy'; content: string }
  | { kind: 'style'; patch: StylePatch }
  | { kind: 'image'; image: string }

/**
 * Select-and-prompt AI editing. The model only ever proposes; applying goes
 * through the normal undoable mutate, so Ctrl+Z works on AI edits too.
 */
export function AiPanel({ element, slideIndex }: { element: SlideElement; slideIndex: number }) {
  const doc = useStore((s) => s.doc)
  const mutate = useStore((s) => s.mutate)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)

  if (element.type !== 'text' && element.type !== 'image') return null

  const run = async (fn: () => Promise<Proposal>) => {
    setBusy(true)
    setError(null)
    setProposal(null)
    try {
      setProposal(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const rewrite = (p: string) =>
    run(async () => {
      const otherTexts = doc.slides
        .flatMap((s) => s.elements)
        .filter((e): e is TextElement => e.type === 'text' && e.id !== element.id)
        .map((e) => e.content)
        .slice(0, 8)
      const r = await aiRewriteText(element as TextElement, p, otherTexts)
      return { kind: 'copy', content: r.content }
    })

  const restyle = (p: string) =>
    run(async () => {
      const bg = doc.slides[slideIndex].background.type
      const patch = await aiRestyleText(element as TextElement, p, bg)
      return { kind: 'style', patch }
    })

  const editImage = (p: string) =>
    run(async () => {
      const png = await toPngDataUrl((element as ImageElement).src)
      const r = await aiEditImage(png, p)
      return { kind: 'image', image: r.image }
    })

  const apply = () => {
    if (!proposal) return
    mutate((d) => {
      const el = d.slides[slideIndex].elements.find((e) => e.id === element.id)
      if (!el) return
      if (proposal.kind === 'copy' && el.type === 'text') el.content = proposal.content
      if (proposal.kind === 'style' && el.type === 'text') {
        const { animation, ...style } = proposal.patch
        Object.assign(el.style, style)
        if (animation) el.animation = animation
      }
      if (proposal.kind === 'image' && el.type === 'image') el.src = proposal.image
    })
    setProposal(null)
  }

  const isText = element.type === 'text'
  const quick = isText ? COPY_ACTIONS : IMAGE_ACTIONS
  const go = isText ? rewrite : editImage

  return (
    <>
      <div className="panel-title">AI assist</div>
      <div className="ai-chips">
        {quick.map((a) => (
          <button key={a} className="chip" disabled={busy} onClick={() => void go(a)}>
            {a}
          </button>
        ))}
        {isText &&
          STYLE_ACTIONS.map((a) => (
            <button
              key={a}
              className="chip chip-style"
              disabled={busy}
              onClick={() => void restyle(`Restyle: ${a}`)}
            >
              ✦ {a}
            </button>
          ))}
      </div>
      <div className="ai-prompt-row">
        <input
          type="text"
          placeholder={isText ? 'e.g. caption in a nostalgic tone…' : 'e.g. make the sky dramatic…'}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && prompt.trim()) void go(prompt.trim())
          }}
        />
        {isText && (
          <button
            className="btn"
            disabled={busy || !prompt.trim()}
            title="Change the styling instead of the words"
            onClick={() => void restyle(prompt.trim())}
          >
            Style
          </button>
        )}
        <button className="btn" disabled={busy || !prompt.trim()} onClick={() => void go(prompt.trim())}>
          {isText ? 'Write' : 'Edit'}
        </button>
      </div>

      {busy && <div className="ai-status">Thinking…</div>}
      {error && <div className="ai-error">{error}</div>}

      {proposal && (
        <div className="ai-proposal">
          {proposal.kind === 'copy' && <div className="ai-proposal-text">{proposal.content}</div>}
          {proposal.kind === 'style' && (
            <div
              className="ai-proposal-text"
              style={{
                fontFamily: proposal.patch.fontFamily,
                fontStyle: proposal.patch.fontStyle,
                fontWeight: proposal.patch.fontWeight,
                color: proposal.patch.color,
                letterSpacing: proposal.patch.letterSpacing,
              }}
            >
              {(element as TextElement).content}
              <div className="ai-patch-summary">
                {Object.entries(proposal.patch)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </div>
            </div>
          )}
          {proposal.kind === 'image' && (
            <img className="ai-proposal-img" src={proposal.image} alt="AI edit proposal" />
          )}
          <div className="field-row">
            <button className="btn btn-primary" onClick={apply}>
              Apply
            </button>
            <button className="btn" onClick={() => setProposal(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Image models want png/jpeg; rasterize SVG/remote sources via canvas. */
async function toPngDataUrl(src: string, maxDim = 1536): Promise<string> {
  if (/^data:image\/(png|jpeg)/.test(src)) return src
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('could not load image for AI edit'))
    img.src = src
  })
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
