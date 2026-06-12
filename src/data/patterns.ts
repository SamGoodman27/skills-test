import type { CSSProperties } from 'react'

/** Tileable background patterns, generated as SVG data URIs in any color. */

export interface Pattern {
  id: string
  name: string
  /** Returns one tile's SVG; `c` is the stroke/fill color. */
  tile: (c: string) => string
  baseSize: number
}

const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`

export const PATTERNS: Pattern[] = [
  {
    id: 'dots',
    name: 'Dots',
    baseSize: 28,
    tile: (c) => svg(28, `<circle cx="14" cy="14" r="2.4" fill="${c}"/>`),
  },
  {
    id: 'grid',
    name: 'Grid',
    baseSize: 36,
    tile: (c) =>
      svg(36, `<path d="M0 .5 H36 M.5 0 V36" stroke="${c}" stroke-width="1" fill="none"/>`),
  },
  {
    id: 'stripes',
    name: 'Stripes',
    baseSize: 24,
    tile: (c) =>
      svg(
        24,
        `<path d="M-6 30 L30 -6 M-6 18 L18 -6 M6 30 L30 6" stroke="${c}" stroke-width="3" fill="none"/>`,
      ),
  },
  {
    id: 'waves',
    name: 'Waves',
    baseSize: 40,
    tile: (c) =>
      svg(
        40,
        `<path d="M0 10 Q10 0 20 10 T40 10 M0 30 Q10 20 20 30 T40 30" stroke="${c}" stroke-width="2" fill="none"/>`,
      ),
  },
  {
    id: 'plus',
    name: 'Crosses',
    baseSize: 32,
    tile: (c) =>
      svg(32, `<path d="M16 10 V22 M10 16 H22" stroke="${c}" stroke-width="2.4" fill="none"/>`),
  },
]

export function patternCss(ref: string, color: string, scale: number): CSSProperties {
  const p = PATTERNS.find((x) => x.id === ref) ?? PATTERNS[0]
  const size = Math.max(8, Math.round(p.baseSize * scale))
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(p.tile(color))}")`,
    backgroundSize: `${size}px ${size}px`,
  }
}
