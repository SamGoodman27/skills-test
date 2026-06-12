import { useRef, useState } from 'react'
import { AutoDesignDialog } from './AutoDesignDialog'
import { MagicCreateDialog } from './MagicCreateDialog'
import { ExportMenu } from './ExportMenu'
import { useStore } from '../state/store'
import type { Slideshow } from '../types/slideshow'
import { formatTime } from '../lib/util'
import { totalDuration } from '../player/timeline'

export function TopBar() {
  const doc = useStore((s) => s.doc)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const setPreviewOpen = useStore((s) => s.setPreviewOpen)
  const loadDoc = useStore((s) => s.loadDoc)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [autoDesignOpen, setAutoDesignOpen] = useState(false)
  const [magicOpen, setMagicOpen] = useState(false)

  const save = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[^\w\- ]+/g, '') || 'slideshow'}.slideshow.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const open = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Slideshow
      if (parsed.version !== 1 || !Array.isArray(parsed.slides)) {
        throw new Error('not a slideshow file')
      }
      loadDoc(parsed)
    } catch {
      alert('That file is not a valid .slideshow.json project.')
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" />
        Lumière
      </div>
      <div className="topbar-doc">
        {doc.title} · {doc.slides.length} slides · {formatTime(totalDuration(doc))}
      </div>
      <div className="topbar-actions">
        <button className="btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          ↩ Undo
        </button>
        <button className="btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
          ↪ Redo
        </button>
        <span className="topbar-sep" />
        <button className="btn" onClick={() => fileInput.current?.click()}>
          Open
        </button>
        <button className="btn" onClick={save}>
          Save
        </button>
        <button className="btn" onClick={() => setMagicOpen(true)}>
          ✨ Magic Create
        </button>
        <button className="btn" onClick={() => setAutoDesignOpen(true)}>
          ✦ Auto-design
        </button>
        <ExportMenu />
        <button className="btn btn-primary" onClick={() => setPreviewOpen(true)}>
          ▶ Preview
        </button>
      </div>
      {autoDesignOpen && <AutoDesignDialog onClose={() => setAutoDesignOpen(false)} />}
      {magicOpen && <MagicCreateDialog onClose={() => setMagicOpen(false)} />}
      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={(e) => void open(e.target.files?.[0])}
      />
    </header>
  )
}
