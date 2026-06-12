import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { exportPdf, exportPngs, exportPptx } from '../export/documents'
import { exportHtml } from '../export/htmlExport'
import { startTabRecording } from '../export/videoExport'

export function ExportMenu() {
  const doc = useStore((s) => s.doc)
  const setPreviewOpen = useStore((s) => s.setPreviewOpen)
  const setRecorder = useStore((s) => s.setRecorder)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  const run = async (label: string, fn: () => Promise<void>) => {
    setOpen(false)
    setBusy(label)
    try {
      await fn()
    } catch (err) {
      console.error(err)
      alert(`${label} export failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(null)
    }
  }

  const progress = (label: string) => (done: number, total: number) =>
    setBusy(`${label} ${done}/${total}`)

  const recordVideo = async () => {
    setOpen(false)
    try {
      // Chrome will ask which surface to share — pick "This tab".
      const rec = await startTabRecording(doc.title)
      setRecorder(rec)
      setPreviewOpen(true)
    } catch {
      // User cancelled the share prompt; nothing to do.
    }
  }

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button className="btn" disabled={busy !== null} onClick={() => setOpen((o) => !o)}>
        {busy ?? 'Export ▾'}
      </button>
      {open && (
        <div className="menu">
          <button onClick={() => void run('PNG', () => exportPngs(doc, progress('PNG')))}>
            Slides as PNG
          </button>
          <button onClick={() => void run('PDF', () => exportPdf(doc, progress('PDF')))}>
            PDF document
          </button>
          <button onClick={() => void run('PPTX', () => exportPptx(doc, progress('PPTX')))}>
            PowerPoint (.pptx)
          </button>
          <button onClick={() => void run('HTML', async () => exportHtml(doc))}>
            Web page (.html, self-playing)
          </button>
          <button onClick={() => void recordVideo()}>Record video (WebM)</button>
          <div className="menu-note">
            Frame-perfect MP4: save the project, then
            <code>node scripts/render-video.mjs</code>
          </div>
        </div>
      )}
    </div>
  )
}
