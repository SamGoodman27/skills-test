import { useCallback, useEffect, useRef, useState } from 'react'
import type { Slideshow } from '../types/slideshow'
import { resolveTimeline, totalDuration } from './timeline'
import { transitionStyle } from './effects'
import { SlideRenderer } from './SlideRenderer'
import { formatTime } from '../lib/util'

/**
 * Fullscreen preview. A requestAnimationFrame clock advances `t`; every
 * visual is derived from `t` through resolveTimeline, so the scrubber can
 * jump anywhere and the picture is always correct.
 */
export function Player({ doc, onClose }: { doc: Slideshow; onClose: () => void }) {
  const total = totalDuration(doc)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const tRef = useRef(0)
  const playingRef = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  const seek = useCallback(
    (next: number, resync = true) => {
      const v = Math.max(0, Math.min(next, total))
      tRef.current = v
      setT(v)
      const audio = audioRef.current
      if (audio && resync) audio.currentTime = v / 1000
    },
    [total],
  )

  // Clock
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (playingRef.current) {
        let next = tRef.current + dt
        if (next >= total) {
          next = total
          playingRef.current = false
          setPlaying(false)
          audioRef.current?.pause()
        }
        tRef.current = next
        setT(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total])

  // Audio follows play state
  useEffect(() => {
    playingRef.current = playing
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.currentTime = tRef.current / 1000
      void audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [playing])

  // Fit the canvas to the window
  useEffect(() => {
    const fit = () => {
      const el = stageRef.current
      if (!el) return
      const pad = 0.92
      setScale(
        Math.min(
          (el.clientWidth / doc.settings.width) * pad,
          (el.clientHeight / doc.settings.height) * pad,
        ),
      )
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [doc.settings.width, doc.settings.height])

  // Keyboard: space toggles, esc closes, arrows nudge
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
      if (e.key === 'ArrowRight') seek(tRef.current + 2000)
      if (e.key === 'ArrowLeft') seek(tRef.current - 2000)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, seek])

  const pos = resolveTimeline(doc, t)
  const slide = doc.slides[pos.slideIndex]
  const prev = pos.prevSlideIndex !== null ? doc.slides[pos.prevSlideIndex] : null

  return (
    <div className="player-overlay">
      <div className="player-stage" ref={stageRef}>
        <div
          className="player-canvas"
          style={{
            width: doc.settings.width,
            height: doc.settings.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {prev && (
            <div className="player-layer">
              <SlideRenderer
                slide={prev}
                settings={doc.settings}
                time={prev.duration}
                playVideos
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
              playVideos
            />
          </div>
        </div>
      </div>

      <div className="player-controls">
        <button
          className="btn btn-icon"
          onClick={() => {
            if (!playing && tRef.current >= total) seek(0)
            setPlaying((p) => !p)
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="player-time">{formatTime(t)}</span>
        <input
          className="player-scrubber"
          type="range"
          min={0}
          max={total}
          step={50}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="player-time">{formatTime(total)}</span>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>

      {doc.settings.audio && (
        <audio
          ref={audioRef}
          src={doc.settings.audio.src}
          loop={doc.settings.audio.loop}
          autoPlay
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = doc.settings.audio?.volume ?? 1
          }}
        />
      )}
    </div>
  )
}
