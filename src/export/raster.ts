import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Slideshow } from '../types/slideshow'
import { SlideRenderer } from '../player/SlideRenderer'

/**
 * Rasterizes one slide (settled state) to a PNG data URL by mounting the
 * real renderer offscreen — exports look exactly like the editor because
 * they go through the same component.
 */
export async function renderSlideToPng(
  doc: Slideshow,
  index: number,
  pixelRatio = 1,
): Promise<string> {
  const { width, height } = doc.settings
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;overflow:hidden;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    flushSync(() => {
      root.render(
        createElement(SlideRenderer, {
          slide: doc.slides[index],
          settings: doc.settings,
          time: null,
        }),
      )
    })

    await document.fonts.ready
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = img.onerror = () => res(null)
            }),
      ),
    )

    const { toPng } = await import('html-to-image')
    const surface = host.firstElementChild as HTMLElement
    return await toPng(surface, { width, height, pixelRatio })
  } finally {
    root.unmount()
    host.remove()
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  downloadDataUrl(url, filename)
  URL.revokeObjectURL(url)
}

export function safeName(title: string): string {
  return title.replace(/[^\w\- ]+/g, '').trim() || 'slideshow'
}
