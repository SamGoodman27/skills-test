import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useStore } from '../state/store'
import { SlideRenderer } from '../player/SlideRenderer'
import { clamp } from '../lib/util'

type Handle = 'nw' | 'ne' | 'sw' | 'se'

interface Gesture {
  elementId: string
  mode: 'move' | Handle
  startX: number
  startY: number
  frame: { x: number; y: number; w: number; h: number }
}

/**
 * The editing canvas: the slide rendered in its settled state, with a
 * selection overlay on top. Frames are normalized 0–1, so drag deltas are
 * divided by the canvas's on-screen size.
 */
export function CanvasStage() {
  const doc = useStore((s) => s.doc)
  const selectedSlide = useStore((s) => s.selectedSlide)
  const selectedElement = useStore((s) => s.selectedElement)
  const selectElement = useStore((s) => s.selectElement)
  const mutate = useStore((s) => s.mutate)
  const checkpoint = useStore((s) => s.checkpoint)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0.3)
  const gestureRef = useRef<Gesture | null>(null)

  const slide = doc.slides[selectedSlide]
  const { width, height } = doc.settings

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current
      if (!el) return
      const pad = 0.94
      setScale(Math.min((el.clientWidth / width) * pad, (el.clientHeight / height) * pad))
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [width, height])

  const beginGesture = (
    e: ReactPointerEvent,
    elementId: string,
    mode: Gesture['mode'],
  ) => {
    e.stopPropagation()
    const el = slide.elements.find((x) => x.id === elementId)
    if (!el) return
    selectElement(elementId)
    checkpoint()
    gestureRef.current = {
      elementId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      frame: { ...el.frame },
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gestureRef.current
    if (!g) return
    const dx = (e.clientX - g.startX) / (width * scale)
    const dy = (e.clientY - g.startY) / (height * scale)
    const f = { ...g.frame }
    const MIN = 0.03

    if (g.mode === 'move') {
      f.x = clamp(g.frame.x + dx, -f.w + MIN, 1 - MIN)
      f.y = clamp(g.frame.y + dy, -f.h + MIN, 1 - MIN)
    } else {
      if (g.mode.includes('e')) f.w = Math.max(MIN, g.frame.w + dx)
      if (g.mode.includes('s')) f.h = Math.max(MIN, g.frame.h + dy)
      if (g.mode.includes('w')) {
        f.w = Math.max(MIN, g.frame.w - dx)
        f.x = g.frame.x + g.frame.w - f.w
      }
      if (g.mode.includes('n')) {
        f.h = Math.max(MIN, g.frame.h - dy)
        f.y = g.frame.y + g.frame.h - f.h
      }
    }

    mutate((d) => {
      const el = d.slides[selectedSlide].elements.find((x) => x.id === g.elementId)
      if (el) el.frame = f
    }, false)
  }

  const endGesture = () => {
    gestureRef.current = null
  }

  if (!slide) return <div className="canvas-wrap" ref={wrapRef} />

  return (
    <div
      className="canvas-wrap"
      ref={wrapRef}
      onPointerDown={() => selectElement(null)}
    >
      <div
        className="canvas-scaler"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <div
          className="canvas-doc"
          style={{ width, height, transform: `scale(${scale})` }}
        >
          <SlideRenderer slide={slide} settings={doc.settings} time={null} />
        </div>

        {/* Selection overlay in screen space */}
        <div
          className="canvas-overlay"
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
        >
          {slide.elements.map((item) => (
            <ElementHit
              key={item.id}
              id={item.id}
              frame={item.frame}
              selected={item.id === selectedElement}
              onStart={beginGesture}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ElementHit({
  id,
  frame,
  selected,
  onStart,
}: {
  id: string
  frame: { x: number; y: number; w: number; h: number }
  selected: boolean
  onStart: (e: ReactPointerEvent, elementId: string, mode: 'move' | Handle) => void
}) {
  return (
    <div
      className={`el-hit${selected ? ' selected' : ''}`}
      style={{
        left: `${frame.x * 100}%`,
        top: `${frame.y * 100}%`,
        width: `${frame.w * 100}%`,
        height: `${frame.h * 100}%`,
      }}
      onPointerDown={(e) => onStart(e, id, 'move')}
    >
      {selected &&
        (['nw', 'ne', 'sw', 'se'] as Handle[]).map((h) => (
          <div
            key={h}
            className={`el-handle el-handle-${h}`}
            onPointerDown={(e) => onStart(e, id, h)}
          />
        ))}
    </div>
  )
}
