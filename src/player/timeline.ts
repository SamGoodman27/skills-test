import type { Slideshow } from '../types/slideshow'

/**
 * The timeline is a pure function of absolute time t (ms). Nothing in the
 * player free-runs: every visual state can be reconstructed for any t,
 * which is what makes scrubbing — and later frame-stepped video export —
 * possible.
 */

export interface TimelinePosition {
  slideIndex: number
  /** ms since this slide became current. */
  localTime: number
  /** 0–1 eased-input progress of the incoming transition, or null when settled. */
  transitionProgress: number | null
  prevSlideIndex: number | null
}

export function totalDuration(doc: Slideshow): number {
  return doc.slides.reduce((sum, s) => sum + s.duration, 0)
}

export function slideStartTime(doc: Slideshow, index: number): number {
  let t = 0
  for (let i = 0; i < index; i++) t += doc.slides[i].duration
  return t
}

export function resolveTimeline(doc: Slideshow, t: number): TimelinePosition {
  const slides = doc.slides
  if (slides.length === 0) {
    return { slideIndex: 0, localTime: 0, transitionProgress: null, prevSlideIndex: null }
  }

  const total = totalDuration(doc)
  const time = Math.max(0, Math.min(t, total - 1))

  let start = 0
  let index = 0
  for (let i = 0; i < slides.length; i++) {
    if (time < start + slides[i].duration) {
      index = i
      break
    }
    start += slides[i].duration
    index = i
  }

  const localTime = time - start
  const slide = slides[index]
  const transMs = Math.min(doc.settings.transitionDuration, slide.duration)

  const transitioning =
    index > 0 && slide.transition !== 'none' && localTime < transMs

  return {
    slideIndex: index,
    localTime,
    transitionProgress: transitioning ? localTime / transMs : null,
    prevSlideIndex: transitioning ? index - 1 : null,
  }
}
