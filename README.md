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
- **Backgrounds** — solid, two-stop gradient with angle, image with blur
  and tinted scrim, tileable patterns (dots/grid/stripes/waves/crosses) in
  any two colors, or "blurred photo" echoing the slide's own image.
- **Ornaments** — a built-in library of recolorable SVG decorations
  (corners, frames, dividers, shapes, doodles) placed like any element.
- **Auto-design** — one click restyles the whole show from a theme
  (Elegant, Vibrant, Minimal, Scrapbook) with a Uniform / Varied / Random
  consistency dial; seeded shuffle re-rolls the look, and it's one undo
  step. No AI required — this is the deterministic half of Magic Create.
- **Timing** — default slide duration plus per-slide override.
- **Page dimensions** — 16:9, 9:16, 1:1, 4:3 presets or custom; element
  frames are normalized 0–1 so layouts survive dimension changes.
- **Music** — attach an audio file (volume, loop); it plays in sync with
  preview, including seeks.
- **Preview player** — fullscreen, scrubber, space to play/pause, arrows
  to skim, Esc to close. Every frame is a pure function of time `t`.
- **Save / open** — projects round-trip as self-contained
  `.slideshow.json` files (media embedded as data URIs).
- **Export** — from the Export menu:
  - **PNG** per slide and **PDF** (one page per slide, exact dimensions)
  - **PowerPoint (.pptx)** — slides as full-bleed snapshots
  - **Web page (.html)** — a single self-playing file with all
    transitions, animations, and music embedded; share it anywhere
  - **Record video (WebM)** — records the preview via tab capture
    (Chrome), music included
  - **Frame-perfect MP4** — offline renderer:

    ```bash
    npm run build
    npx playwright install chromium   # once; ffmpeg must be on PATH
    node scripts/render-video.mjs my-show.slideshow.json out.mp4 --fps 30
    ```

    It steps the timeline frame by frame through the `?render` harness,
    so output quality is independent of machine speed, and muxes the
    embedded audio track.

## AI assist (optional)

Select a text or image element and the inspector grows an **AI assist**
section: quick actions plus a free prompt.

- **Text**: rewrite the copy ("shorter", "more poetic", or anything you
  type — nearby slide text is sent along so tone stays consistent), or
  restyle by description ("elegant serif", "like a vintage poster") —
  the model returns values constrained to the style schema, so it can
  never produce something the renderer can't draw.
- **Images**: generative edits via prompt ("warmer light", "remove the
  clutter") through Gemini's image model.
- Everything is propose-then-apply: you see the result first, and an
  applied AI edit is a normal undo step.

Setup — keys live in a local service, never in the browser:

```bash
cp server/.env.example server/.env   # add ANTHROPIC_API_KEY (+ GEMINI_API_KEY for image edits)
npm run server                       # terminal 1
npm run dev                          # terminal 2 (proxies /ai to the service)
```

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

1. ~~Schema + player + editor core~~
2. ~~Ornaments, pattern & blurred-media backgrounds, theme auto-design~~
3. ~~Exports: PNG / PDF / PPTX / HTML / WebM / MP4 renderer~~
4. ~~AI service: select-and-prompt copywriting, style-by-prompt, image edits~~
5. Magic Create: analyze media → plan → deterministic assembly, with a
   Uniform ↔ Varied ↔ Random consistency dial
6. Beat-synced transitions, bundled royalty-free music, GIF export
