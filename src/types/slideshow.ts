/**
 * The slideshow document. Everything the editor edits and the player plays
 * is described here — keeping it pure data is what makes the show editable,
 * AI-patchable, and exportable from one code path.
 */

export type TransitionType =
  | 'none'
  | 'crossfade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'zoom'
  | 'wipe'

export type AnimationType =
  | 'none'
  | 'fade'
  | 'fade-up'
  | 'fade-down'
  | 'zoom-in'
  | 'ken-burns'

/** Normalized 0–1 coordinates relative to the slide canvas, so layouts
 *  survive dimension changes. */
export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
  /** Subtle shadow so text stays readable over photos. */
  shadow: boolean
}

interface ElementBase {
  id: string
  frame: Frame
  rotation: number
  opacity: number
  zIndex: number
  animation: AnimationType
  /** ms after slide start before the entrance animation begins. */
  animationDelay: number
}

export interface TextElement extends ElementBase {
  type: 'text'
  content: string
  style: TextStyle
}

export interface ImageElement extends ElementBase {
  type: 'image'
  src: string
  fit: 'cover' | 'contain'
}

export interface VideoElement extends ElementBase {
  type: 'video'
  src: string
  fit: 'cover' | 'contain'
  muted: boolean
  loop: boolean
}

/** A decorative SVG from the built-in library, recolorable via currentColor. */
export interface OrnamentElement extends ElementBase {
  type: 'ornament'
  ref: string
  color: string
}

export type SlideElement = TextElement | ImageElement | VideoElement | OrnamentElement

export interface GradientStop {
  color: string
  at: number
}

export interface Background {
  /** 'blurred-media' reuses the slide's first image, scaled up and blurred. */
  type: 'solid' | 'gradient' | 'image' | 'pattern' | 'blurred-media'
  color: string
  gradientAngle: number
  gradientStops: GradientStop[]
  src?: string
  blur: number
  patternRef: string
  patternColor: string
  patternScale: number
  /** Tinted scrim over image backgrounds for text readability. */
  overlayColor: string
  overlayOpacity: number
}

export interface Slide {
  id: string
  /** Dwell time in ms. */
  duration: number
  /** Transition used to enter this slide. */
  transition: TransitionType
  background: Background
  elements: SlideElement[]
}

export interface AudioTrack {
  src: string
  name: string
  volume: number
  loop: boolean
}

export interface Settings {
  width: number
  height: number
  defaultDuration: number
  defaultTransition: TransitionType
  transitionDuration: number
  audio: AudioTrack | null
}

export interface Slideshow {
  version: 1
  title: string
  settings: Settings
  slides: Slide[]
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 600,
  fontStyle: 'normal',
  color: '#ffffff',
  align: 'center',
  lineHeight: 1.25,
  letterSpacing: 0,
  shadow: true,
}

export const DEFAULT_BACKGROUND: Background = {
  type: 'solid',
  color: '#101014',
  gradientAngle: 135,
  gradientStops: [
    { color: '#1f1c3a', at: 0 },
    { color: '#0e0d16', at: 1 },
  ],
  blur: 0,
  patternRef: 'dots',
  patternColor: '#3a3650',
  patternScale: 1,
  overlayColor: '#000000',
  overlayOpacity: 0,
}

export const FONT_FAMILIES = [
  'Inter',
  'Fraunces',
  'Playfair Display',
  'Cormorant Garamond',
  'Montserrat',
  'Caveat',
  'Space Grotesk',
] as const

export const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'Cut' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'slide-left', label: 'Slide left' },
  { value: 'slide-right', label: 'Slide right' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipe', label: 'Wipe' },
]

export const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade in' },
  { value: 'fade-up', label: 'Fade up' },
  { value: 'fade-down', label: 'Fade down' },
  { value: 'zoom-in', label: 'Zoom in' },
  { value: 'ken-burns', label: 'Ken Burns' },
]
