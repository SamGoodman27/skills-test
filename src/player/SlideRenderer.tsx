import type { CSSProperties } from 'react'
import type { Background, Settings, Slide, SlideElement } from '../types/slideshow'
import { elementMotion } from './effects'

/**
 * Pure renderer for one slide at a moment in time.
 * `time` is ms since the slide became current; null renders the settled
 * state for the editor canvas and thumbnails.
 */
export function SlideRenderer({
  slide,
  settings,
  time,
  playVideos = false,
}: {
  slide: Slide
  settings: Settings
  time: number | null
  playVideos?: boolean
}) {
  return (
    <div
      className="slide-surface"
      style={{ width: settings.width, height: settings.height }}
    >
      <BackgroundLayer bg={slide.background} />
      {slide.elements.map((el) => (
        <ElementView
          key={el.id}
          el={el}
          time={time}
          slideDuration={slide.duration}
          playVideos={playVideos}
        />
      ))}
    </div>
  )
}

function backgroundCss(bg: Background): CSSProperties {
  if (bg.type === 'gradient') {
    const stops = bg.gradientStops
      .map((s) => `${s.color} ${Math.round(s.at * 100)}%`)
      .join(', ')
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${stops})` }
  }
  return { background: bg.color }
}

function BackgroundLayer({ bg }: { bg: Background }) {
  return (
    <div className="slide-bg" style={backgroundCss(bg)}>
      {bg.type === 'image' && bg.src && (
        <img
          className="slide-bg-media"
          src={bg.src}
          alt=""
          style={{ filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined }}
        />
      )}
      {bg.overlayOpacity > 0 && (
        <div
          className="slide-bg-overlay"
          style={{ background: bg.overlayColor, opacity: bg.overlayOpacity }}
        />
      )}
    </div>
  )
}

function ElementView({
  el,
  time,
  slideDuration,
  playVideos,
}: {
  el: SlideElement
  time: number | null
  slideDuration: number
  playVideos: boolean
}) {
  const motion = elementMotion(el.animation, el.animationDelay, time, slideDuration, el.id)

  const frame: CSSProperties = {
    left: `${el.frame.x * 100}%`,
    top: `${el.frame.y * 100}%`,
    width: `${el.frame.w * 100}%`,
    height: `${el.frame.h * 100}%`,
    zIndex: el.zIndex,
    opacity: el.opacity,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  }

  return (
    <div className="el-frame" style={frame}>
      <div className="el-motion" style={motion.container}>
        {el.type === 'text' && (
          <div
            className="el-text"
            style={{
              fontFamily: `'${el.style.fontFamily}', sans-serif`,
              fontSize: el.style.fontSize,
              fontWeight: el.style.fontWeight,
              fontStyle: el.style.fontStyle,
              color: el.style.color,
              textAlign: el.style.align,
              lineHeight: el.style.lineHeight,
              letterSpacing: el.style.letterSpacing,
              textShadow: el.style.shadow
                ? '0 2px 18px rgba(0,0,0,0.55)'
                : undefined,
              justifyContent:
                el.style.align === 'left'
                  ? 'flex-start'
                  : el.style.align === 'right'
                    ? 'flex-end'
                    : 'center',
            }}
          >
            <span style={{ whiteSpace: 'pre-wrap', width: '100%' }}>{el.content}</span>
          </div>
        )}
        {el.type === 'image' && (
          <div className="el-media-clip">
            <img
              className="el-media"
              src={el.src}
              alt=""
              style={{ objectFit: el.fit, ...motion.media }}
            />
          </div>
        )}
        {el.type === 'video' && (
          <div className="el-media-clip">
            <video
              className="el-media"
              src={el.src}
              muted={el.muted}
              loop={el.loop}
              playsInline
              autoPlay={playVideos}
              style={{ objectFit: el.fit, ...motion.media }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
