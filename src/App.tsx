import { useEffect } from 'react'
import { useStore } from './state/store'
import { TopBar } from './editor/TopBar'
import { SlideList } from './editor/SlideList'
import { CanvasStage } from './editor/CanvasStage'
import { Inspector } from './editor/Inspector'
import { Player } from './player/Player'

export default function App() {
  const doc = useStore((s) => s.doc)
  const previewOpen = useStore((s) => s.previewOpen)
  const setPreviewOpen = useStore((s) => s.setPreviewOpen)
  const recorder = useStore((s) => s.recorder)
  const setRecorder = useStore((s) => s.setRecorder)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const selectedElement = useStore((s) => s.selectedElement)
  const deleteElement = useStore((s) => s.deleteElement)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        deleteElement(selectedElement)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedElement, deleteElement])

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <SlideList />
        <CanvasStage />
        <Inspector />
      </div>
      {previewOpen && (
        <Player
          doc={doc}
          onClose={() => {
            recorder?.stop()
            setRecorder(null)
            setPreviewOpen(false)
          }}
          onEnded={() => {
            if (recorder) {
              recorder.stop()
              setRecorder(null)
              setPreviewOpen(false)
            }
          }}
        />
      )}
    </div>
  )
}
