import { create } from 'zustand'
import type { Slide, SlideElement, Slideshow } from '../types/slideshow'
import { DEFAULT_BACKGROUND, DEFAULT_TEXT_STYLE } from '../types/slideshow'
import { uid } from '../lib/util'
import type { TabRecorder } from '../export/videoExport'
import { demoSlideshow } from '../data/demo'
import { getOrnament } from '../data/ornaments'

const HISTORY_LIMIT = 100

interface EditorState {
  doc: Slideshow
  selectedSlide: number
  selectedElement: string | null
  previewOpen: boolean
  /** Active tab recorder while exporting video via the preview. */
  recorder: TabRecorder | null
  past: Slideshow[]
  future: Slideshow[]

  /**
   * All document edits go through here. `commit: false` is for mid-gesture
   * updates (dragging); call `checkpoint()` once before the gesture starts.
   */
  mutate: (fn: (doc: Slideshow) => void, commit?: boolean) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void

  selectSlide: (index: number) => void
  selectElement: (id: string | null) => void
  setPreviewOpen: (open: boolean) => void
  setRecorder: (rec: TabRecorder | null) => void
  loadDoc: (doc: Slideshow) => void

  addSlide: () => void
  duplicateSlide: (index: number) => void
  deleteSlide: (index: number) => void
  moveSlide: (index: number, dir: -1 | 1) => void

  addTextElement: () => void
  addMediaElement: (type: 'image' | 'video', src: string) => void
  addOrnamentElement: (ref: string) => void
  deleteElement: (id: string) => void
}

function newSlide(doc: Slideshow): Slide {
  return {
    id: uid(),
    duration: doc.settings.defaultDuration,
    transition: doc.settings.defaultTransition,
    background: structuredClone(DEFAULT_BACKGROUND),
    elements: [],
  }
}

export const useStore = create<EditorState>((set, get) => ({
  doc: demoSlideshow(),
  selectedSlide: 0,
  selectedElement: null,
  previewOpen: false,
  recorder: null,
  past: [],
  future: [],

  mutate: (fn, commit = true) => {
    const { doc, past } = get()
    const next = structuredClone(doc)
    fn(next)
    set({
      doc: next,
      ...(commit
        ? { past: [...past.slice(-HISTORY_LIMIT), doc], future: [] }
        : {}),
    })
  },

  checkpoint: () => {
    const { doc, past } = get()
    set({ past: [...past.slice(-HISTORY_LIMIT), structuredClone(doc)], future: [] })
  },

  undo: () => {
    const { doc, past, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future],
      selectedSlide: Math.min(get().selectedSlide, prev.slides.length - 1),
      selectedElement: null,
    })
  },

  redo: () => {
    const { doc, past, future } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      doc: next,
      past: [...past, doc],
      future: future.slice(1),
      selectedSlide: Math.min(get().selectedSlide, next.slides.length - 1),
      selectedElement: null,
    })
  },

  selectSlide: (index) => set({ selectedSlide: index, selectedElement: null }),
  selectElement: (id) => set({ selectedElement: id }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setRecorder: (rec) => set({ recorder: rec }),

  loadDoc: (doc) =>
    set({ doc, past: [], future: [], selectedSlide: 0, selectedElement: null }),

  addSlide: () => {
    const { mutate, selectedSlide } = get()
    mutate((doc) => {
      doc.slides.splice(selectedSlide + 1, 0, newSlide(doc))
    })
    set({ selectedSlide: selectedSlide + 1, selectedElement: null })
  },

  duplicateSlide: (index) => {
    get().mutate((doc) => {
      const copy = structuredClone(doc.slides[index])
      copy.id = uid()
      copy.elements.forEach((el) => (el.id = uid()))
      doc.slides.splice(index + 1, 0, copy)
    })
    set({ selectedSlide: index + 1, selectedElement: null })
  },

  deleteSlide: (index) => {
    const { doc, mutate } = get()
    if (doc.slides.length <= 1) return
    mutate((d) => {
      d.slides.splice(index, 1)
    })
    set({
      selectedSlide: Math.min(index, get().doc.slides.length - 1),
      selectedElement: null,
    })
  },

  moveSlide: (index, dir) => {
    const { doc, mutate } = get()
    const target = index + dir
    if (target < 0 || target >= doc.slides.length) return
    mutate((d) => {
      const [s] = d.slides.splice(index, 1)
      d.slides.splice(target, 0, s)
    })
    set({ selectedSlide: target })
  },

  addTextElement: () => {
    const id = uid()
    get().mutate((doc) => {
      const slide = doc.slides[get().selectedSlide]
      const el: SlideElement = {
        id,
        type: 'text',
        content: 'Your text here',
        style: structuredClone(DEFAULT_TEXT_STYLE),
        frame: { x: 0.2, y: 0.4, w: 0.6, h: 0.2 },
        rotation: 0,
        opacity: 1,
        zIndex: slide.elements.length + 1,
        animation: 'fade-up',
        animationDelay: 200,
      }
      slide.elements.push(el)
    })
    set({ selectedElement: id })
  },

  addMediaElement: (type, src) => {
    const id = uid()
    get().mutate((doc) => {
      const slide = doc.slides[get().selectedSlide]
      const base = {
        id,
        frame: { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
        rotation: 0,
        opacity: 1,
        zIndex: slide.elements.length + 1,
        animationDelay: 0,
      }
      const el: SlideElement =
        type === 'image'
          ? { ...base, type: 'image', src, fit: 'cover', animation: 'ken-burns' }
          : { ...base, type: 'video', src, fit: 'cover', muted: true, loop: true, animation: 'fade' }
      slide.elements.push(el)
    })
    set({ selectedElement: id })
  },

  addOrnamentElement: (ref) => {
    const id = uid()
    const orn = getOrnament(ref)
    get().mutate((doc) => {
      const slide = doc.slides[get().selectedSlide]
      slide.elements.push({
        id,
        type: 'ornament',
        ref,
        color: '#f0a83c',
        frame: {
          x: 0.4,
          y: 0.4,
          w: orn?.defaultFrame.w ?? 0.15,
          h: orn?.defaultFrame.h ?? 0.15,
        },
        rotation: 0,
        opacity: 1,
        zIndex: slide.elements.length + 1,
        animation: 'fade',
        animationDelay: 0,
      })
    })
    set({ selectedElement: id })
  },

  deleteElement: (id) => {
    get().mutate((doc) => {
      const slide = doc.slides[get().selectedSlide]
      slide.elements = slide.elements.filter((el) => el.id !== id)
    })
    set({ selectedElement: null })
  },
}))
