import type {
  AnimationType,
  Background,
  Slideshow,
  TextElement,
  TransitionType,
} from '../types/slideshow'
import { mulberry32, uid } from './util'

/**
 * Non-AI auto-design: restyles the whole show from a theme's curated pools.
 * The consistency dial decides how much the seeded RNG is allowed to vary:
 *   uniform — first item of every pool, identical everywhere
 *   varied  — draws from a small pool, no placement jitter
 *   random  — full pools, rotation jitter, ornaments sprinkled in corners
 * Layout frames are preserved; only styling is rewritten.
 */

export type Consistency = 'uniform' | 'varied' | 'random'

export interface Theme {
  id: string
  name: string
  description: string
  headingFont: string
  bodyFont: string
  textColors: string[]
  accentColors: string[]
  backgrounds: Partial<Background>[]
  transitions: TransitionType[]
  imageAnimations: AnimationType[]
  textAnimations: AnimationType[]
  ornaments: string[]
}

const bg = (b: Partial<Background>): Partial<Background> => b

export const THEMES: Theme[] = [
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Serif type, deep tones, slow crossfades',
    headingFont: 'Playfair Display',
    bodyFont: 'Cormorant Garamond',
    textColors: ['#f3ead8', '#e8dcc8'],
    accentColors: ['#c9a96a', '#8d7a55'],
    backgrounds: [
      bg({ type: 'gradient', gradientAngle: 150, gradientStops: [{ color: '#1d1a26', at: 0 }, { color: '#0c0a12', at: 1 }] }),
      bg({ type: 'solid', color: '#15121c' }),
      bg({ type: 'blurred-media', blur: 26, overlayColor: '#0c0a12', overlayOpacity: 0.45 }),
    ],
    transitions: ['crossfade', 'zoom'],
    imageAnimations: ['ken-burns', 'fade'],
    textAnimations: ['fade-up', 'fade'],
    ornaments: ['corner-flourish', 'divider-diamond', 'frame-line'],
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold sans type, saturated gradients, energetic moves',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    textColors: ['#ffffff', '#fff3d6'],
    accentColors: ['#ffd166', '#ef476f', '#06d6a0'],
    backgrounds: [
      bg({ type: 'gradient', gradientAngle: 35, gradientStops: [{ color: '#5f0f87', at: 0 }, { color: '#16213e', at: 1 }] }),
      bg({ type: 'gradient', gradientAngle: 120, gradientStops: [{ color: '#0f3460', at: 0 }, { color: '#16213e', at: 1 }] }),
      bg({ type: 'pattern', color: '#1a1a2e', patternRef: 'stripes', patternColor: '#26264a', patternScale: 1.4 }),
    ],
    transitions: ['slide-left', 'slide-up', 'wipe', 'zoom'],
    imageAnimations: ['zoom-in', 'ken-burns'],
    textAnimations: ['fade-up', 'zoom-in'],
    ornaments: ['shape-burst', 'doodle-confetti', 'divider-wave'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Quiet grotesk type, plain grounds, cuts and fades',
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
    textColors: ['#1c1c1e'],
    accentColors: ['#8e8e93'],
    backgrounds: [
      bg({ type: 'solid', color: '#f5f3ef' }),
      bg({ type: 'solid', color: '#ebe7e0' }),
      bg({ type: 'pattern', color: '#f5f3ef', patternRef: 'grid', patternColor: '#e3ded4', patternScale: 1.2 }),
    ],
    transitions: ['crossfade', 'none'],
    imageAnimations: ['fade', 'ken-burns'],
    textAnimations: ['fade', 'fade-up'],
    ornaments: ['divider-diamond'],
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    description: 'Handwritten accents, doodles, playful tilt',
    headingFont: 'Caveat',
    bodyFont: 'Inter',
    textColors: ['#fdf6ec', '#ffe8d6'],
    accentColors: ['#f7b2ad', '#ffd166', '#9bf6ff'],
    backgrounds: [
      bg({ type: 'pattern', color: '#2b2118', patternRef: 'dots', patternColor: '#46382b', patternScale: 1 }),
      bg({ type: 'gradient', gradientAngle: 160, gradientStops: [{ color: '#3a2a3d', at: 0 }, { color: '#1f1722', at: 1 }] }),
      bg({ type: 'blurred-media', blur: 22, overlayColor: '#1f1722', overlayOpacity: 0.5 }),
    ],
    transitions: ['slide-left', 'slide-right', 'crossfade', 'zoom'],
    imageAnimations: ['zoom-in', 'fade-up', 'ken-burns'],
    textAnimations: ['fade-up', 'zoom-in'],
    ornaments: ['doodle-heart', 'doodle-sparkle', 'doodle-confetti', 'doodle-arrow'],
  },
]

const CORNER_FRAMES = [
  { x: 0.03, y: 0.05 },
  { x: 0.85, y: 0.05 },
  { x: 0.03, y: 0.82 },
  { x: 0.85, y: 0.82 },
]

export function autoDesign(
  doc: Slideshow,
  themeId: string,
  consistency: Consistency,
  seed: number,
): void {
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
  const rng = mulberry32(seed)

  const pick = <T>(pool: T[], i: number): T => {
    if (consistency === 'uniform' || pool.length === 1) return pool[0]
    if (consistency === 'varied')
      return pool[(i + Math.floor(rng() * 2)) % Math.min(pool.length, 3)]
    return pool[Math.floor(rng() * pool.length)]
  }
  const jitter = (range: number) =>
    consistency === 'random' ? (rng() * 2 - 1) * range : 0

  doc.slides.forEach((slide, i) => {
    if (i > 0) slide.transition = pick(theme.transitions, i)

    slide.background = {
      ...slide.background,
      overlayOpacity: 0,
      ...pick(theme.backgrounds, i),
    } as Background

    // Largest text on the slide gets the heading treatment.
    const texts = slide.elements.filter((e): e is TextElement => e.type === 'text')
    const heading = texts.reduce(
      (a, b) => (b.style.fontSize > (a?.style.fontSize ?? 0) ? b : a),
      texts[0],
    )

    // Drop ornaments from a previous auto-design pass before re-sprinkling.
    slide.elements = slide.elements.filter((e) => e.type !== 'ornament')

    for (const el of slide.elements) {
      if (el.type === 'text') {
        const isHeading = el === heading
        el.style.fontFamily = isHeading ? theme.headingFont : theme.bodyFont
        el.style.color = isHeading
          ? pick(theme.textColors, i)
          : pick([...theme.accentColors, ...theme.textColors], i + 1)
        el.animation = pick(theme.textAnimations, i)
        el.rotation = Math.round(jitter(3) * 10) / 10
      } else if (el.type === 'image' || el.type === 'video') {
        el.animation =
          el.type === 'image' ? pick(theme.imageAnimations, i) : 'fade'
        el.rotation = Math.round(jitter(2.5) * 10) / 10
      }
    }

    // Random mode scatters a couple of themed ornaments into free corners.
    if (consistency === 'random' && theme.ornaments.length > 0) {
      const count = 1 + Math.floor(rng() * 2)
      const corners = [...CORNER_FRAMES].sort(() => rng() - 0.5).slice(0, count)
      for (const corner of corners) {
        slide.elements.push({
          id: uid(),
          type: 'ornament',
          ref: theme.ornaments[Math.floor(rng() * theme.ornaments.length)],
          color: theme.accentColors[Math.floor(rng() * theme.accentColors.length)],
          frame: { ...corner, w: 0.1, h: 0.13 },
          rotation: Math.round(jitter(12)),
          opacity: 0.9,
          zIndex: 20,
          animation: 'fade',
          animationDelay: 600 + Math.floor(rng() * 600),
        })
      }
    } else if (consistency === 'uniform' && theme.ornaments.length > 0) {
      // Uniform mode: the same quiet corner mark on every slide.
      slide.elements.push({
        id: uid(),
        type: 'ornament',
        ref: theme.ornaments[0],
        color: theme.accentColors[0],
        frame: { x: 0.04, y: 0.06, w: 0.08, h: 0.11 },
        rotation: 0,
        opacity: 0.8,
        zIndex: 20,
        animation: 'fade',
        animationDelay: 800,
      })
    }
  })
}
