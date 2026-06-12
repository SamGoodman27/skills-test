import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import type {
  Background,
  Settings,
  Slide,
  SlideElement,
  Slideshow,
  TextElement,
} from '../types/slideshow'
import { ANIMATIONS, FONT_FAMILIES, TRANSITIONS } from '../types/slideshow'
import { ColorInput, Field, NumberInput, Row, SelectInput, SliderInput } from './fields'
import { readFileAsDataURL } from '../lib/util'

type Tab = 'element' | 'slide' | 'show'

export function Inspector() {
  const doc = useStore((s) => s.doc)
  const selectedSlide = useStore((s) => s.selectedSlide)
  const selectedElement = useStore((s) => s.selectedElement)
  const [tab, setTab] = useState<Tab>('slide')

  // Jump to the element tab whenever the selection changes (state derived
  // during render, per react.dev "you might not need an effect").
  const [lastSelection, setLastSelection] = useState(selectedElement)
  if (selectedElement !== lastSelection) {
    setLastSelection(selectedElement)
    setTab(selectedElement ? 'element' : 'slide')
  }

  const slide = doc.slides[selectedSlide]
  const element = slide?.elements.find((e) => e.id === selectedElement) ?? null

  return (
    <aside className="inspector">
      <div className="tabs">
        <button
          className={tab === 'element' ? 'active' : ''}
          disabled={!element}
          onClick={() => setTab('element')}
        >
          Element
        </button>
        <button className={tab === 'slide' ? 'active' : ''} onClick={() => setTab('slide')}>
          Slide
        </button>
        <button className={tab === 'show' ? 'active' : ''} onClick={() => setTab('show')}>
          Show
        </button>
      </div>
      <div className="inspector-scroll">
        {tab === 'element' && element && (
          <ElementPanel element={element} slideIndex={selectedSlide} />
        )}
        {tab === 'slide' && slide && <SlidePanel slide={slide} slideIndex={selectedSlide} />}
        {tab === 'show' && <ShowPanel doc={doc} />}
      </div>
    </aside>
  )
}

/* ---------- Element ---------- */

function ElementPanel({ element, slideIndex }: { element: SlideElement; slideIndex: number }) {
  const mutate = useStore((s) => s.mutate)
  const deleteElement = useStore((s) => s.deleteElement)

  const update = (fn: (el: SlideElement) => void) =>
    mutate((doc) => {
      const el = doc.slides[slideIndex].elements.find((e) => e.id === element.id)
      if (el) fn(el)
    })

  return (
    <>
      <div className="panel-title">
        {element.type === 'text' ? 'Text' : element.type === 'image' ? 'Image' : 'Video'}
      </div>

      {element.type === 'text' && <TextFields element={element} update={update} />}

      {(element.type === 'image' || element.type === 'video') && (
        <Field label="Fit">
          <SelectInput
            value={element.fit}
            onChange={(v) =>
              update((el) => {
                if (el.type !== 'text') el.fit = v
              })
            }
            options={[
              { value: 'cover', label: 'Cover (fill)' },
              { value: 'contain', label: 'Contain' },
            ]}
          />
        </Field>
      )}

      {element.type === 'video' && (
        <Row>
          <Field label="Muted">
            <input
              type="checkbox"
              checked={element.muted}
              onChange={(e) =>
                update((el) => {
                  if (el.type === 'video') el.muted = e.target.checked
                })
              }
            />
          </Field>
          <Field label="Loop">
            <input
              type="checkbox"
              checked={element.loop}
              onChange={(e) =>
                update((el) => {
                  if (el.type === 'video') el.loop = e.target.checked
                })
              }
            />
          </Field>
        </Row>
      )}

      <div className="panel-title">Animation</div>
      <Field label="Entrance">
        <SelectInput
          value={element.animation}
          onChange={(v) => update((el) => (el.animation = v))}
          options={ANIMATIONS}
        />
      </Field>
      <Field label="Delay (ms)">
        <NumberInput
          value={element.animationDelay}
          min={0}
          step={100}
          onChange={(v) => update((el) => (el.animationDelay = v))}
        />
      </Field>

      <div className="panel-title">Layout</div>
      <Row>
        <Field label="Rotation">
          <NumberInput
            value={element.rotation}
            step={1}
            onChange={(v) => update((el) => (el.rotation = v))}
          />
        </Field>
        <Field label="Layer">
          <NumberInput
            value={element.zIndex}
            min={0}
            step={1}
            onChange={(v) => update((el) => (el.zIndex = v))}
          />
        </Field>
      </Row>
      <Field label="Opacity">
        <SliderInput
          value={element.opacity}
          min={0}
          max={1}
          onChange={(v) => update((el) => (el.opacity = v))}
        />
      </Field>

      <button className="btn btn-danger btn-block" onClick={() => deleteElement(element.id)}>
        Delete element
      </button>
    </>
  )
}

function TextFields({
  element,
  update,
}: {
  element: TextElement
  update: (fn: (el: SlideElement) => void) => void
}) {
  const setStyle = (fn: (s: TextElement['style']) => void) =>
    update((el) => {
      if (el.type === 'text') fn(el.style)
    })

  return (
    <>
      <Field label="Content">
        <textarea
          rows={3}
          value={element.content}
          onChange={(e) => update((el) => {
            if (el.type === 'text') el.content = e.target.value
          })}
        />
      </Field>
      <Field label="Font">
        <SelectInput
          value={element.style.fontFamily}
          onChange={(v) => setStyle((s) => (s.fontFamily = v))}
          options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
        />
      </Field>
      <Row>
        <Field label="Size">
          <NumberInput
            value={element.style.fontSize}
            min={8}
            step={2}
            onChange={(v) => setStyle((s) => (s.fontSize = v))}
          />
        </Field>
        <Field label="Weight">
          <SelectInput
            value={String(element.style.fontWeight)}
            onChange={(v) => setStyle((s) => (s.fontWeight = Number(v)))}
            options={[
              { value: '300', label: 'Light' },
              { value: '400', label: 'Regular' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semibold' },
              { value: '700', label: 'Bold' },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label="Style">
          <SelectInput
            value={element.style.fontStyle}
            onChange={(v) => setStyle((s) => (s.fontStyle = v))}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'italic', label: 'Italic' },
            ]}
          />
        </Field>
        <Field label="Align">
          <SelectInput
            value={element.style.align}
            onChange={(v) => setStyle((s) => (s.align = v))}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </Field>
      </Row>
      <Field label="Color">
        <ColorInput
          value={element.style.color}
          onChange={(v) => setStyle((s) => (s.color = v))}
        />
      </Field>
      <Row>
        <Field label="Line height">
          <NumberInput
            value={element.style.lineHeight}
            min={0.8}
            max={3}
            step={0.05}
            onChange={(v) => setStyle((s) => (s.lineHeight = v))}
          />
        </Field>
        <Field label="Letter sp.">
          <NumberInput
            value={element.style.letterSpacing}
            step={0.5}
            onChange={(v) => setStyle((s) => (s.letterSpacing = v))}
          />
        </Field>
      </Row>
      <Field label="Shadow (readability)">
        <input
          type="checkbox"
          checked={element.style.shadow}
          onChange={(e) => setStyle((s) => (s.shadow = e.target.checked))}
        />
      </Field>
    </>
  )
}

/* ---------- Slide ---------- */

function SlidePanel({ slide, slideIndex }: { slide: Slide; slideIndex: number }) {
  const mutate = useStore((s) => s.mutate)
  const addTextElement = useStore((s) => s.addTextElement)
  const addMediaElement = useStore((s) => s.addMediaElement)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)

  const update = (fn: (s: Slide) => void) =>
    mutate((doc) => fn(doc.slides[slideIndex]))

  const pickMedia = async (file: File | undefined, type: 'image' | 'video') => {
    if (!file) return
    addMediaElement(type, await readFileAsDataURL(file))
  }

  return (
    <>
      <div className="panel-title">Add content</div>
      <Row>
        <button className="btn" onClick={addTextElement}>+ Text</button>
        <button className="btn" onClick={() => imageInput.current?.click()}>+ Image</button>
        <button className="btn" onClick={() => videoInput.current?.click()}>+ Video</button>
      </Row>
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => void pickMedia(e.target.files?.[0], 'image')}
      />
      <input
        ref={videoInput}
        hidden
        type="file"
        accept="video/*"
        onChange={(e) => void pickMedia(e.target.files?.[0], 'video')}
      />

      <div className="panel-title">Timing</div>
      <Field label="Duration (ms)">
        <NumberInput
          value={slide.duration}
          min={500}
          step={500}
          onChange={(v) => update((s) => (s.duration = v))}
        />
      </Field>
      <Field label="Transition in">
        <SelectInput
          value={slide.transition}
          onChange={(v) => update((s) => (s.transition = v))}
          options={TRANSITIONS}
        />
      </Field>

      <BackgroundPanel
        bg={slide.background}
        update={(fn) => update((s) => fn(s.background))}
      />
    </>
  )
}

function BackgroundPanel({
  bg,
  update,
}: {
  bg: Background
  update: (fn: (b: Background) => void) => void
}) {
  const fileInput = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <div className="panel-title">Background</div>
      <Field label="Type">
        <SelectInput
          value={bg.type}
          onChange={(v) => update((b) => (b.type = v))}
          options={[
            { value: 'solid', label: 'Solid color' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Image' },
          ]}
        />
      </Field>

      {bg.type === 'solid' && (
        <Field label="Color">
          <ColorInput value={bg.color} onChange={(v) => update((b) => (b.color = v))} />
        </Field>
      )}

      {bg.type === 'gradient' && (
        <>
          <Row>
            <Field label="From">
              <ColorInput
                value={bg.gradientStops[0]?.color ?? '#000000'}
                onChange={(v) => update((b) => (b.gradientStops[0].color = v))}
              />
            </Field>
            <Field label="To">
              <ColorInput
                value={bg.gradientStops[bg.gradientStops.length - 1]?.color ?? '#000000'}
                onChange={(v) =>
                  update((b) => (b.gradientStops[b.gradientStops.length - 1].color = v))
                }
              />
            </Field>
          </Row>
          <Field label="Angle">
            <SliderInput
              value={bg.gradientAngle}
              min={0}
              max={360}
              step={1}
              onChange={(v) => update((b) => (b.gradientAngle = v))}
            />
          </Field>
        </>
      )}

      {bg.type === 'image' && (
        <>
          <button className="btn btn-block" onClick={() => fileInput.current?.click()}>
            {bg.src ? 'Replace image…' : 'Choose image…'}
          </button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) {
                const src = await readFileAsDataURL(f)
                update((b) => (b.src = src))
              }
            }}
          />
          <Field label="Blur">
            <SliderInput
              value={bg.blur}
              min={0}
              max={40}
              step={1}
              onChange={(v) => update((b) => (b.blur = v))}
            />
          </Field>
          <Field label="Scrim color">
            <ColorInput
              value={bg.overlayColor}
              onChange={(v) => update((b) => (b.overlayColor = v))}
            />
          </Field>
          <Field label="Scrim strength">
            <SliderInput
              value={bg.overlayOpacity}
              min={0}
              max={1}
              onChange={(v) => update((b) => (b.overlayOpacity = v))}
            />
          </Field>
        </>
      )}
    </>
  )
}

/* ---------- Show ---------- */

const DIMENSION_PRESETS = [
  { label: 'Landscape 16:9', w: 1920, h: 1080 },
  { label: 'Portrait 9:16', w: 1080, h: 1920 },
  { label: 'Square 1:1', w: 1080, h: 1080 },
  { label: 'Classic 4:3', w: 1440, h: 1080 },
]

function ShowPanel({ doc }: { doc: Slideshow }) {
  const mutate = useStore((s) => s.mutate)
  const audioInput = useRef<HTMLInputElement | null>(null)

  const update = (fn: (s: Settings) => void) => mutate((d) => fn(d.settings))

  const preset = DIMENSION_PRESETS.find(
    (p) => p.w === doc.settings.width && p.h === doc.settings.height,
  )

  return (
    <>
      <div className="panel-title">Show</div>
      <Field label="Title">
        <input
          type="text"
          value={doc.title}
          onChange={(e) => mutate((d) => (d.title = e.target.value))}
        />
      </Field>

      <div className="panel-title">Page dimensions</div>
      <Field label="Preset">
        <SelectInput
          value={preset?.label ?? 'Custom'}
          onChange={(label) => {
            const p = DIMENSION_PRESETS.find((x) => x.label === label)
            if (p)
              update((s) => {
                s.width = p.w
                s.height = p.h
              })
          }}
          options={[
            ...DIMENSION_PRESETS.map((p) => ({ value: p.label, label: p.label })),
            ...(preset ? [] : [{ value: 'Custom', label: 'Custom' }]),
          ]}
        />
      </Field>
      <Row>
        <Field label="Width">
          <NumberInput
            value={doc.settings.width}
            min={320}
            step={10}
            onChange={(v) => update((s) => (s.width = v))}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            value={doc.settings.height}
            min={320}
            step={10}
            onChange={(v) => update((s) => (s.height = v))}
          />
        </Field>
      </Row>

      <div className="panel-title">Defaults</div>
      <Field label="Slide duration (ms)">
        <NumberInput
          value={doc.settings.defaultDuration}
          min={500}
          step={500}
          onChange={(v) => update((s) => (s.defaultDuration = v))}
        />
      </Field>
      <Field label="Transition">
        <SelectInput
          value={doc.settings.defaultTransition}
          onChange={(v) => update((s) => (s.defaultTransition = v))}
          options={TRANSITIONS}
        />
      </Field>
      <Field label="Transition length (ms)">
        <NumberInput
          value={doc.settings.transitionDuration}
          min={100}
          max={4000}
          step={100}
          onChange={(v) => update((s) => (s.transitionDuration = v))}
        />
      </Field>

      <div className="panel-title">Music</div>
      {doc.settings.audio ? (
        <>
          <div className="audio-name">{doc.settings.audio.name}</div>
          <Field label="Volume">
            <SliderInput
              value={doc.settings.audio.volume}
              min={0}
              max={1}
              onChange={(v) =>
                update((s) => {
                  if (s.audio) s.audio.volume = v
                })
              }
            />
          </Field>
          <Field label="Loop">
            <input
              type="checkbox"
              checked={doc.settings.audio.loop}
              onChange={(e) =>
                update((s) => {
                  if (s.audio) s.audio.loop = e.target.checked
                })
              }
            />
          </Field>
          <button
            className="btn btn-danger btn-block"
            onClick={() => update((s) => (s.audio = null))}
          >
            Remove music
          </button>
        </>
      ) : (
        <button className="btn btn-block" onClick={() => audioInput.current?.click()}>
          Add music…
        </button>
      )}
      <input
        ref={audioInput}
        hidden
        type="file"
        accept="audio/*"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          const src = await readFileAsDataURL(f)
          update((s) => {
            s.audio = { src, name: f.name, volume: 0.8, loop: true }
          })
        }}
      />
    </>
  )
}
