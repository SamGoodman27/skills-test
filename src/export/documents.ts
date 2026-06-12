import type { Slideshow } from '../types/slideshow'
import { downloadDataUrl, renderSlideToPng, safeName } from './raster'

export type ExportProgress = (done: number, total: number) => void

/** One PNG download per slide. */
export async function exportPngs(doc: Slideshow, onProgress?: ExportProgress): Promise<void> {
  const name = safeName(doc.title)
  for (let i = 0; i < doc.slides.length; i++) {
    const png = await renderSlideToPng(doc, i)
    downloadDataUrl(png, `${name}-${String(i + 1).padStart(2, '0')}.png`)
    onProgress?.(i + 1, doc.slides.length)
  }
}

/** One PDF, one page per slide at the show's exact dimensions. */
export async function exportPdf(doc: Slideshow, onProgress?: ExportProgress): Promise<void> {
  const { width, height } = doc.settings
  const { jsPDF } = await import('jspdf')
  const orientation: 'landscape' | 'portrait' = width >= height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] })

  for (let i = 0; i < doc.slides.length; i++) {
    if (i > 0) pdf.addPage([width, height], orientation)
    const png = await renderSlideToPng(doc, i)
    pdf.addImage(png, 'PNG', 0, 0, width, height)
    onProgress?.(i + 1, doc.slides.length)
  }
  pdf.save(`${safeName(doc.title)}.pdf`)
}

/**
 * PowerPoint export. Slides are placed as full-bleed snapshots (animations
 * and custom layouts don't survive the PPT model), so the deck always looks
 * exactly like the show — at the cost of not being text-editable in PPT.
 */
export async function exportPptx(doc: Slideshow, onProgress?: ExportProgress): Promise<void> {
  const { width, height } = doc.settings
  const pptxgen = (await import('pptxgenjs')).default
  const pptx = new pptxgen()
  const wIn = width / 96
  const hIn = height / 96
  pptx.defineLayout({ name: 'show', width: wIn, height: hIn })
  pptx.layout = 'show'

  for (let i = 0; i < doc.slides.length; i++) {
    const png = await renderSlideToPng(doc, i)
    pptx.addSlide().addImage({ data: png, x: 0, y: 0, w: wIn, h: hIn })
    onProgress?.(i + 1, doc.slides.length)
  }
  await pptx.writeFile({ fileName: `${safeName(doc.title)}.pptx` })
}
