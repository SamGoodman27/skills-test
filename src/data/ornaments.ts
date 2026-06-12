/**
 * Built-in ornament library. Every asset is an inline SVG drawn with
 * `currentColor`, so one asset recolors to any theme via a single CSS color.
 */

export interface Ornament {
  id: string
  name: string
  category: 'corners' | 'frames' | 'dividers' | 'shapes' | 'doodles'
  svg: string
  /** Sensible starting size as a fraction of the slide. */
  defaultFrame: { w: number; h: number }
  /** Frames stretch to any aspect; everything else keeps its own. */
  stretch?: boolean
}

const vb = (w: number, h: number, body: string, stretch = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="${stretch ? 'none' : 'xMidYMid meet'}">${body}</svg>`

export const ORNAMENTS: Ornament[] = [
  {
    id: 'corner-flourish',
    name: 'Flourish corner',
    category: 'corners',
    defaultFrame: { w: 0.16, h: 0.22 },
    svg: vb(
      100,
      100,
      `<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <path d="M6 94 C6 40 40 6 94 6"/>
        <path d="M6 70 C6 36 36 6 70 6"/>
        <circle cx="94" cy="6" r="4" fill="currentColor" stroke="none"/>
        <circle cx="6" cy="94" r="4" fill="currentColor" stroke="none"/>
        <path d="M28 52 q10 -14 24 -24" stroke-width="2"/>
      </g>`,
    ),
  },
  {
    id: 'corner-leaves',
    name: 'Leafy corner',
    category: 'corners',
    defaultFrame: { w: 0.15, h: 0.2 },
    svg: vb(
      100,
      100,
      `<g fill="currentColor">
        <path d="M10 90 C20 60 40 40 80 28 C55 50 40 65 32 88 Z"/>
        <ellipse cx="62" cy="34" rx="14" ry="6" transform="rotate(-32 62 34)"/>
        <ellipse cx="40" cy="56" rx="12" ry="5" transform="rotate(-45 40 56)"/>
        <ellipse cx="24" cy="76" rx="10" ry="4.5" transform="rotate(-58 24 76)"/>
      </g>`,
    ),
  },
  {
    id: 'frame-line',
    name: 'Line frame',
    category: 'frames',
    defaultFrame: { w: 0.9, h: 0.86 },
    stretch: true,
    svg: vb(
      200,
      120,
      `<g fill="none" stroke="currentColor">
        <rect x="3" y="3" width="194" height="114" stroke-width="2"/>
        <rect x="8" y="8" width="184" height="104" stroke-width="1"/>
      </g>`,
      true,
    ),
  },
  {
    id: 'frame-deco',
    name: 'Deco frame',
    category: 'frames',
    defaultFrame: { w: 0.9, h: 0.86 },
    stretch: true,
    svg: vb(
      200,
      120,
      `<g fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="192" height="112"/>
        <path d="M4 18 L18 4 M196 18 L182 4 M4 102 L18 116 M196 102 L182 116" stroke-width="1.5"/>
      </g>`,
      true,
    ),
  },
  {
    id: 'divider-diamond',
    name: 'Diamond divider',
    category: 'dividers',
    defaultFrame: { w: 0.36, h: 0.04 },
    stretch: true,
    svg: vb(
      300,
      20,
      `<g fill="currentColor">
        <rect x="0" y="9" width="130" height="2"/>
        <rect x="170" y="9" width="130" height="2"/>
        <rect x="143" y="3" width="14" height="14" transform="rotate(45 150 10)"/>
      </g>`,
      true,
    ),
  },
  {
    id: 'divider-wave',
    name: 'Wave divider',
    category: 'dividers',
    defaultFrame: { w: 0.3, h: 0.035 },
    stretch: true,
    svg: vb(
      300,
      20,
      `<path d="M0 10 Q15 0 30 10 T60 10 T90 10 T120 10 T150 10 T180 10 T210 10 T240 10 T270 10 T300 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
      true,
    ),
  },
  {
    id: 'shape-blob',
    name: 'Blob',
    category: 'shapes',
    defaultFrame: { w: 0.24, h: 0.3 },
    svg: vb(
      100,
      100,
      `<path d="M52 5 C76 7 95 24 94 48 C93 74 76 95 50 94 C26 93 6 76 6 50 C6 24 28 3 52 5 Z" fill="currentColor"/>`,
    ),
  },
  {
    id: 'shape-burst',
    name: 'Starburst',
    category: 'shapes',
    defaultFrame: { w: 0.14, h: 0.18 },
    svg: vb(
      100,
      100,
      `<g stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <path d="M50 8 V30 M50 70 V92 M8 50 H30 M70 50 H92 M21 21 L36 36 M64 64 L79 79 M79 21 L64 36 M36 64 L21 79"/>
      </g>`,
    ),
  },
  {
    id: 'doodle-heart',
    name: 'Heart',
    category: 'doodles',
    defaultFrame: { w: 0.08, h: 0.1 },
    svg: vb(
      100,
      100,
      `<path d="M50 88 C20 64 8 46 12 30 C16 16 34 12 44 22 L50 28 L56 22 C66 12 84 16 88 30 C92 46 80 64 50 88 Z" fill="currentColor"/>`,
    ),
  },
  {
    id: 'doodle-sparkle',
    name: 'Sparkle',
    category: 'doodles',
    defaultFrame: { w: 0.07, h: 0.09 },
    svg: vb(
      100,
      100,
      `<path d="M50 4 C54 30 60 38 96 50 C60 62 54 70 50 96 C46 70 40 62 4 50 C40 38 46 30 50 4 Z" fill="currentColor"/>`,
    ),
  },
  {
    id: 'doodle-confetti',
    name: 'Confetti',
    category: 'doodles',
    defaultFrame: { w: 0.16, h: 0.18 },
    svg: vb(
      100,
      100,
      `<g fill="currentColor">
        <rect x="12" y="14" width="10" height="4" rx="2" transform="rotate(24 17 16)"/>
        <rect x="70" y="10" width="10" height="4" rx="2" transform="rotate(-40 75 12)"/>
        <rect x="44" y="44" width="10" height="4" rx="2" transform="rotate(64 49 46)"/>
        <rect x="16" y="72" width="10" height="4" rx="2" transform="rotate(-18 21 74)"/>
        <circle cx="62" cy="70" r="4"/>
        <circle cx="86" cy="44" r="3.5"/>
        <circle cx="34" cy="32" r="3"/>
        <path d="M78 82 l5 -9 l5 9 Z"/>
      </g>`,
    ),
  },
  {
    id: 'doodle-arrow',
    name: 'Hand arrow',
    category: 'doodles',
    defaultFrame: { w: 0.12, h: 0.08 },
    svg: vb(
      100,
      60,
      `<g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 40 C30 18 60 16 88 28"/>
        <path d="M74 14 L90 28 L70 36"/>
      </g>`,
    ),
  },
]

export const ORNAMENT_CATEGORIES = [
  'corners',
  'frames',
  'dividers',
  'shapes',
  'doodles',
] as const

export function getOrnament(ref: string): Ornament | undefined {
  return ORNAMENTS.find((o) => o.id === ref)
}
