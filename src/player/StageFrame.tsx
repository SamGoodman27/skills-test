import type { Slideshow } from '../types/slideshow'
import { resolveTimeline } from './timeline'
import { transitionStyle } from './effects'
import { SlideRenderer } from './SlideRenderer'

/**
 * One frame of the whole show at absolute time `t`, at natural pixel size.
 * Shared by the preview player, the video render harness, and exports.
 */
export function StageFrame({
  doc,
  t,
  playVideos = false,
}: {
  doc: Slideshow
  t: number
  playVideos?: boolean
}) {
  const pos = resolveTimeline(doc, t)
  const slide = doc.slides[pos.slideIndex]
  const prev = pos.prevSlideIndex !== null ? doc.slides[pos.prevSlideIndex] : null
  if (!slide) return null

  return (
    <>
      {prev && (
        <div className="player-layer">
          <SlideRenderer
            slide={prev}
            settings={doc.settings}
            time={prev.duration}
            playVideos={playVideos}
          />
        </div>
      )}
      <div
        className="player-layer"
        style={
          pos.transitionProgress !== null
            ? transitionStyle(slide.transition, pos.transitionProgress)
            : undefined
        }
      >
        <SlideRenderer
          slide={slide}
          settings={doc.settings}
          time={pos.localTime}
          playVideos={playVideos}
        />
      </div>
    </>
  )
}
