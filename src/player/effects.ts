import type { CSSProperties } from 'react'
import type { AnimationType, TransitionType } from '../types/slideshow'
import { clamp01, easeInOutCubic, easeOutCubic, hashString } from '../lib/util'

/**
 * All motion is computed as inline styles from time, restricted to
 * transform / opacity / clip-path so everything stays GPU-composited and
 * deterministic for export.
 */

const ENTRANCE_MS = 700

/** Style for a slide layer entering via `type` at raw progress p (0–1). */
export function transitionStyle(type: TransitionType, rawP: number): CSSProperties {
  const p = easeInOutCubic(clamp01(rawP))
  switch (type) {
    case 'crossfade':
      return { opacity: p }
    case 'slide-left':
      return { transform: `translateX(${(1 - p) * 100}%)` }
    case 'slide-right':
      return { transform: `translateX(${-(1 - p) * 100}%)` }
    case 'slide-up':
      return { transform: `translateY(${(1 - p) * 100}%)` }
    case 'zoom':
      return { opacity: p, transform: `scale(${1.08 - 0.08 * p})` }
    case 'wipe':
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }
    default:
      return {}
  }
}

export interface ElementMotion {
  /** Applied to the element's frame container. */
  container: CSSProperties
  /** Applied to the media inside the frame (Ken Burns pan/zoom). */
  media: CSSProperties
}

/**
 * Motion for one element at `localTime` ms into its slide.
 * `localTime === null` means static/editing view: render the settled state.
 */
export function elementMotion(
  animation: AnimationType,
  delay: number,
  localTime: number | null,
  slideDuration: number,
  seed: string,
): ElementMotion {
  if (localTime === null || animation === 'none') {
    return { container: {}, media: {} }
  }

  const p = easeOutCubic(clamp01((localTime - delay) / ENTRANCE_MS))

  switch (animation) {
    case 'fade':
      return { container: { opacity: p }, media: {} }
    case 'fade-up':
      return {
        container: { opacity: p, transform: `translateY(${(1 - p) * 28}px)` },
        media: {},
      }
    case 'fade-down':
      return {
        container: { opacity: p, transform: `translateY(${-(1 - p) * 28}px)` },
        media: {},
      }
    case 'zoom-in':
      return {
        container: { opacity: p, transform: `scale(${0.9 + 0.1 * p})` },
        media: {},
      }
    case 'ken-burns': {
      // Slow continuous pan/zoom across the whole dwell; the direction is
      // derived from the element id so it varies between photos but stays
      // identical on every replay.
      const q = clamp01(localTime / Math.max(slideDuration, 1))
      const dir = hashString(seed) % 4
      const scale = 1.06 + 0.1 * q
      const pan = 2.2 * (dir < 2 ? q : 1 - q)
      const x = dir % 2 === 0 ? pan : -pan
      const y = dir % 2 === 0 ? -pan * 0.6 : pan * 0.6
      return {
        container: { opacity: p },
        media: { transform: `scale(${scale}) translate(${x}%, ${y}%)` },
      }
    }
    default:
      return { container: {}, media: {} }
  }
}
