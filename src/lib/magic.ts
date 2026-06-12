import type { Slide, SlideElement, Slideshow, TextStyle } from '../types/slideshow'
import { DEFAULT_BACKGROUND, DEFAULT_TEXT_STYLE } from '../types/slideshow'
import { mulberry32, uid } from './util'
import { autoDesign } from './autodesign'
import type { Consistency } from './autodesign'

/**
 * Magic Create, stage 3: deterministic assembly. The AI (or the no-AI
 * fallback) only chooses sequence/layout/words; frames come from these
 * hand-tuned templates, so the result is always valid and well-composed.
 * The final document then goes through the same theme engine as the
 * Auto-design button.
 */

export interface MagicMedia {
  id: string
  src: string
  kind: 'image' | 'video'
}

export interface PlanSlide {
  media: string[]
  layout: 'title' | 'full' | 'split-left' | 'split-right' | 'pair' | 'grid' | 'closing'
  headline?: string
  caption?: string
  durationMs?: number
}

export interface MagicPlan {
  title: string
  themeId: string
  slides: PlanSlide[]
}

type Frame = { x: number; y: number; w: number; h: number }

function mediaElement(m: MagicMedia, frame: Frame, z: number): SlideElement {
  const base = {
    id: uid(),
    frame,
    rotation: 0,
    opacity: 1,
    zIndex: z,
    animationDelay: 0,
  }
  return m.kind === 'image'
    ? { ...base, type: 'image', src: m.src, fit: 'cover', animation: 'ken-burns' }
    : { ...base, type: 'video', src: m.src, fit: 'cover', muted: true, loop: true, animation: 'fade' }
}

function textElement(
  content: string,
  frame: Frame,
  z: number,
  style: Partial<TextStyle>,
  delay: number,
): SlideElement {
  return {
    id: uid(),
    type: 'text',
    content,
    style: { ...DEFAULT_TEXT_STYLE, ...style },
    frame,
    rotation: 0,
    opacity: 1,
    zIndex: z,
    animation: 'fade-up',
    animationDelay: delay,
  }
}

const GRID_FRAMES: Frame[][] = [
  [{ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }],
  [
    { x: 0.04, y: 0.1, w: 0.45, h: 0.8 },
    { x: 0.51, y: 0.1, w: 0.45, h: 0.8 },
  ],
  [
    { x: 0.03, y: 0.1, w: 0.3, h: 0.8 },
    { x: 0.35, y: 0.1, w: 0.3, h: 0.8 },
    { x: 0.67, y: 0.1, w: 0.3, h: 0.8 },
  ],
  [
    { x: 0.05, y: 0.06, w: 0.44, h: 0.42 },
    { x: 0.51, y: 0.06, w: 0.44, h: 0.42 },
    { x: 0.05, y: 0.52, w: 0.44, h: 0.42 },
    { x: 0.51, y: 0.52, w: 0.44, h: 0.42 },
  ],
]

function buildSlide(plan: PlanSlide, media: MagicMedia[], defaultDuration: number): Slide {
  const els: SlideElement[] = []
  const picked = plan.media
    .map((id) => media.find((m) => m.id === id))
    .filter((m): m is MagicMedia => Boolean(m))
    .slice(0, 4)

  switch (plan.layout) {
    case 'title': {
      if (picked[0]) els.push(mediaElement(picked[0], { x: 0, y: 0, w: 1, h: 1 }, 1))
      if (plan.headline)
        els.push(
          textElement(plan.headline, { x: 0.1, y: 0.36, w: 0.8, h: 0.2 }, 2, { fontSize: 120 }, 500),
        )
      if (plan.caption)
        els.push(
          textElement(plan.caption, { x: 0.2, y: 0.58, w: 0.6, h: 0.08 }, 2, { fontSize: 34, fontWeight: 400, letterSpacing: 3 }, 900),
        )
      break
    }
    case 'full': {
      if (picked[0]) els.push(mediaElement(picked[0], { x: 0, y: 0, w: 1, h: 1 }, 1))
      if (plan.caption)
        els.push(
          textElement(plan.caption, { x: 0.08, y: 0.84, w: 0.84, h: 0.1 }, 2, { fontSize: 38 }, 600),
        )
      break
    }
    case 'split-left':
    case 'split-right': {
      const imgLeft = plan.layout === 'split-left'
      if (picked[0])
        els.push(
          mediaElement(picked[0], { x: imgLeft ? 0.05 : 0.43, y: 0.09, w: 0.52, h: 0.82 }, 1),
        )
      const text = plan.headline ?? plan.caption
      if (text)
        els.push(
          textElement(
            text,
            { x: imgLeft ? 0.62 : 0.06, y: 0.32, w: 0.32, h: 0.36 },
            2,
            { fontSize: 54, align: imgLeft ? 'left' : 'right' },
            400,
          ),
        )
      break
    }
    case 'pair':
    case 'grid': {
      const frames = GRID_FRAMES[Math.min(picked.length, 4) - 1] ?? GRID_FRAMES[0]
      picked.forEach((m, i) => els.push(mediaElement(m, frames[i], 1)))
      if (plan.caption)
        els.push(
          textElement(plan.caption, { x: 0.1, y: 0.91, w: 0.8, h: 0.07 }, 2, { fontSize: 30 }, 700),
        )
      break
    }
    case 'closing': {
      if (picked[0]) els.push(mediaElement(picked[0], { x: 0.36, y: 0.1, w: 0.28, h: 0.45 }, 1))
      if (plan.headline)
        els.push(
          textElement(plan.headline, { x: 0.1, y: picked[0] ? 0.62 : 0.4, w: 0.8, h: 0.16 }, 2, { fontSize: 84 }, 400),
        )
      if (plan.caption)
        els.push(
          textElement(plan.caption, { x: 0.2, y: picked[0] ? 0.8 : 0.58, w: 0.6, h: 0.08 }, 2, { fontSize: 32, fontWeight: 400 }, 800),
        )
      break
    }
  }

  // Staggered entrances read better than everything at once.
  els
    .filter((e) => e.type === 'image' || e.type === 'video')
    .forEach((e, i) => (e.animationDelay = i * 150))

  return {
    id: uid(),
    duration: plan.durationMs ?? defaultDuration,
    transition: 'crossfade',
    background: structuredClone(DEFAULT_BACKGROUND),
    elements: els,
  }
}

export function buildShow(
  plan: MagicPlan,
  media: MagicMedia[],
  consistency: Consistency,
  dimensions: { width: number; height: number },
): Slideshow {
  const doc: Slideshow = {
    version: 1,
    title: plan.title,
    settings: {
      ...dimensions,
      defaultDuration: 5000,
      defaultTransition: 'crossfade',
      transitionDuration: 900,
      audio: null,
    },
    slides: plan.slides
      .map((s) => buildSlide(s, media, 5000))
      .filter((s) => s.elements.length > 0),
  }
  autoDesign(doc, plan.themeId, consistency, Math.floor(Math.random() * 2 ** 31))
  return doc
}

/** No-AI fallback: a sensible sequence from media order alone. */
export function fallbackPlan(media: MagicMedia[], vibe: string): MagicPlan {
  const rng = mulberry32(media.length * 7919 + 17)
  const slides: PlanSlide[] = []
  const ids = media.map((m) => m.id)

  slides.push({ media: [ids[0]], layout: 'title', headline: vibe || 'Our story' })
  let i = 1
  while (i < ids.length - 1) {
    const remaining = ids.length - 1 - i
    const take = remaining >= 2 && rng() < 0.35 ? 2 : 1
    if (take === 2) {
      slides.push({ media: [ids[i], ids[i + 1]], layout: 'pair' })
    } else {
      const r = rng()
      slides.push({
        media: [ids[i]],
        layout: r < 0.4 ? 'full' : r < 0.7 ? 'split-left' : 'split-right',
      })
    }
    i += take
  }
  if (i < ids.length) slides.push({ media: [ids[i]], layout: 'closing', headline: 'The end' })
  else slides.push({ media: [], layout: 'closing', headline: 'The end' })

  return { title: vibe || 'Slideshow', themeId: 'elegant', slides }
}
