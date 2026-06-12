import type { Slideshow } from '../types/slideshow'
import { DEFAULT_TEXT_STYLE } from '../types/slideshow'

/** Inline SVG stand-ins for photos so the demo works with zero assets. */
function svgUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const dusk = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1d4f"/><stop offset=".55" stop-color="#b14e6c"/><stop offset="1" stop-color="#f2a65a"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#s)"/>
<circle cx="800" cy="640" r="130" fill="#ffd9a0" opacity=".95"/>
<path d="M0 1000 L0 720 L300 520 L560 760 L820 560 L1100 800 L1380 600 L1600 740 L1600 1000 Z" fill="#1d1430"/>
<path d="M0 1000 L0 840 L420 680 L760 880 L1180 720 L1600 860 L1600 1000 Z" fill="#120c20"/>
</svg>`)

const coast = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec8e3"/><stop offset=".6" stop-color="#1b6f9e"/><stop offset="1" stop-color="#0d3a57"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#k)"/>
<circle cx="1180" cy="240" r="90" fill="#fff4d6"/>
<path d="M0 620 Q400 560 800 620 T1600 620 L1600 1000 L0 1000 Z" fill="#0e4d72"/>
<path d="M0 760 Q400 700 800 760 T1600 760 L1600 1000 L0 1000 Z" fill="#0a3553"/>
<path d="M0 880 Q400 830 800 880 T1600 880 L1600 1000 L0 1000 Z" fill="#072538"/>
</svg>`)

const bloom = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1400" viewBox="0 0 1200 1400">
<rect width="1200" height="1400" fill="#171121"/>
<circle cx="600" cy="660" r="340" fill="#5b2a86" opacity=".9"/>
<circle cx="470" cy="540" r="220" fill="#a4508b" opacity=".85"/>
<circle cx="750" cy="540" r="170" fill="#ef798a" opacity=".8"/>
<circle cx="600" cy="430" r="110" fill="#f7b2ad" opacity=".9"/>
<path d="M600 990 C 560 1180 640 1240 600 1400" stroke="#3a7d44" stroke-width="22" fill="none"/>
</svg>`)



export function demoSlideshow(): Slideshow {
  return {
    version: 1,
    title: 'Golden Hour',
    settings: {
      width: 1920,
      height: 1080,
      defaultDuration: 5000,
      defaultTransition: 'crossfade',
      transitionDuration: 900,
      audio: null,
    },
    slides: [
      {
        id: 'slide-1',
        duration: 5500,
        transition: 'none',
        background: {
          type: 'gradient',
          color: '#101014',
          gradientAngle: 160,
          gradientStops: [
            { color: '#241a3d', at: 0 },
            { color: '#0d0b14', at: 1 },
          ],
          blur: 0,
          patternRef: 'dots',
          patternColor: '#3a3650',
          patternScale: 1,
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        elements: [
          {
            id: 'el-1a',
            type: 'image',
            src: dusk,
            fit: 'cover',
            frame: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            animation: 'ken-burns',
            animationDelay: 0,
          },
          {
            id: 'el-1b',
            type: 'text',
            content: 'Golden Hour',
            style: {
              ...DEFAULT_TEXT_STYLE,
              fontFamily: 'Fraunces',
              fontSize: 132,
              fontWeight: 600,
              color: '#fff3e0',
            },
            frame: { x: 0.1, y: 0.36, w: 0.8, h: 0.2 },
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            animation: 'fade-up',
            animationDelay: 500,
          },
          {
            id: 'el-1c',
            type: 'text',
            content: 'A summer in three slides',
            style: {
              ...DEFAULT_TEXT_STYLE,
              fontFamily: 'Inter',
              fontSize: 34,
              fontWeight: 400,
              letterSpacing: 4,
              color: '#ffd9a0',
            },
            frame: { x: 0.2, y: 0.58, w: 0.6, h: 0.08 },
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            animation: 'fade-up',
            animationDelay: 900,
          },
        ],
      },
      {
        id: 'slide-2',
        duration: 5000,
        transition: 'slide-left',
        background: {
          type: 'solid',
          color: '#0a1622',
          gradientAngle: 135,
          gradientStops: [
            { color: '#0a1622', at: 0 },
            { color: '#0a1622', at: 1 },
          ],
          blur: 0,
          patternRef: 'dots',
          patternColor: '#3a3650',
          patternScale: 1,
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        elements: [
          {
            id: 'el-2a',
            type: 'image',
            src: coast,
            fit: 'cover',
            frame: { x: 0.05, y: 0.09, w: 0.52, h: 0.82 },
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            animation: 'ken-burns',
            animationDelay: 0,
          },
          {
            id: 'el-2b',
            type: 'text',
            content: 'Day one,\nthe long way down\nto the water.',
            style: {
              ...DEFAULT_TEXT_STYLE,
              fontFamily: 'Cormorant Garamond',
              fontSize: 64,
              fontWeight: 500,
              fontStyle: 'italic',
              align: 'left',
              color: '#cfe9f5',
            },
            frame: { x: 0.62, y: 0.3, w: 0.33, h: 0.4 },
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            animation: 'fade-up',
            animationDelay: 400,
          },
        ],
      },
      {
        id: 'slide-3',
        duration: 5500,
        transition: 'zoom',
        background: {
          type: 'gradient',
          color: '#101014',
          gradientAngle: 20,
          gradientStops: [
            { color: '#1c1226', at: 0 },
            { color: '#070509', at: 1 },
          ],
          blur: 0,
          patternRef: 'dots',
          patternColor: '#3a3650',
          patternScale: 1,
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        elements: [
          {
            id: 'el-3a',
            type: 'image',
            src: bloom,
            fit: 'cover',
            frame: { x: 0.33, y: 0.08, w: 0.34, h: 0.7 },
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            animation: 'zoom-in',
            animationDelay: 100,
          },
          {
            id: 'el-3b',
            type: 'text',
            content: 'Until next year',
            style: {
              ...DEFAULT_TEXT_STYLE,
              fontFamily: 'Caveat',
              fontSize: 88,
              fontWeight: 600,
              color: '#f7b2ad',
            },
            frame: { x: 0.25, y: 0.8, w: 0.5, h: 0.12 },
            rotation: -2,
            opacity: 1,
            zIndex: 2,
            animation: 'fade-up',
            animationDelay: 700,
          },
        ],
      },
    ],
  }
}
