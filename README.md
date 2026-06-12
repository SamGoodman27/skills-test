# Lumière — slideshow studio

A local-first photo/video slideshow maker. Slideshows are a single JSON
document (`.slideshow.json`) rendered by a time-driven player, edited on a
drag-and-drop canvas, and built to grow into AI-assisted design and video
export.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. The app loads with a small demo show ("Golden Hour")
built from inline SVG placeholders, so it works with zero assets.

## What works today (Phase 1)

- **Slides & mixed content** — any number of text, image, and video
  elements per slide, freely placed and layered.
- **Canvas editing** — drag to move, corner handles to resize, click to
  select; Delete removes an element; Ctrl+Z / Ctrl+Shift+Z undo/redo.
- **Text styling** — family (7 bundled Google Fonts), size, weight, italic,
  color, alignment, line height, letter spacing, readability shadow.
- **Transitions** — cut, crossfade, slide (3 directions), zoom, wipe; a
  per-show default with per-slide overrides; adjustable transition length.
- **Element animations** — fade, fade up/down, zoom in, Ken Burns
  (direction derived from the element id, so it's stable but varied).
- **Backgrounds** — solid, two-stop gradient with angle, or image with
  blur and a tinted scrim.
- **Timing** — default slide duration plus per-slide override.
- **Page dimensions** — 16:9, 9:16, 1:1, 4:3 presets or custom; element
  frames are normalized 0–1 so layouts survive dimension changes.
- **Music** — attach an audio file (volume, loop); it plays in sync with
  preview, including seeks.
- **Preview player** — fullscreen, scrubber, space to play/pause, arrows
  to skim, Esc to close. Every frame is a pure function of time `t`.
- **Save / open** — projects round-trip as self-contained
  `.slideshow.json` files (media embedded as data URIs).

## Architecture notes

- `src/types/slideshow.ts` — the document schema. Everything (editor, player,
  future AI patches and exporters) operates on this one structure.
- `src/player/timeline.ts` — maps absolute time → slide, local time, and
  transition progress. Pure, so the scrubber and future frame-stepped MP4
  export get correctness for free.
- `src/player/effects.ts` — transitions and element motion as inline
  styles limited to transform / opacity / clip-path (GPU-composited,
  deterministic).
- `src/player/SlideRenderer.tsx` — one renderer shared by the editor
  canvas (settled state), thumbnails, and the player (animated state).
- `src/state/store.ts` — zustand store; all edits flow through `mutate`,
  which snapshots for undo/redo. Drags use `checkpoint()` + uncommitted
  mutations so a gesture is one undo step.

## Roadmap

1. ~~Schema + player + editor core~~ (this phase)
2. Ornament library, pattern backgrounds, more fonts, blurred-media background
3. Export service: PNG / PDF / **MP4** (headless Chromium + FFmpeg) / HTML / PPTX
4. AI service layer: select-and-prompt copywriting, style-by-prompt,
   image edits (Claude + image model)
5. Magic Create: analyze media → plan → deterministic assembly, with a
   Uniform ↔ Varied ↔ Random consistency dial
6. Beat-synced transitions, bundled royalty-free music, GIF export
