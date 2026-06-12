import { useStore } from '../state/store'
import { SlideRenderer } from '../player/SlideRenderer'

const THUMB_W = 168

export function SlideList() {
  const doc = useStore((s) => s.doc)
  const selectedSlide = useStore((s) => s.selectedSlide)
  const selectSlide = useStore((s) => s.selectSlide)
  const addSlide = useStore((s) => s.addSlide)
  const duplicateSlide = useStore((s) => s.duplicateSlide)
  const deleteSlide = useStore((s) => s.deleteSlide)
  const moveSlide = useStore((s) => s.moveSlide)

  const scale = THUMB_W / doc.settings.width
  const thumbH = doc.settings.height * scale

  return (
    <aside className="slide-list">
      <div className="panel-title">Slides</div>
      <div className="slide-list-scroll">
        {doc.slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`slide-thumb${i === selectedSlide ? ' selected' : ''}`}
            onClick={() => selectSlide(i)}
          >
            <div className="slide-thumb-num">{i + 1}</div>
            <div
              className="slide-thumb-canvas"
              style={{ width: THUMB_W, height: thumbH }}
            >
              <div
                style={{
                  width: doc.settings.width,
                  height: doc.settings.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              >
                <SlideRenderer slide={slide} settings={doc.settings} time={null} />
              </div>
            </div>
            {i === selectedSlide && (
              <div className="slide-thumb-actions">
                <button title="Move up" onClick={(e) => { e.stopPropagation(); moveSlide(i, -1) }}>↑</button>
                <button title="Move down" onClick={(e) => { e.stopPropagation(); moveSlide(i, 1) }}>↓</button>
                <button title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateSlide(i) }}>⧉</button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); deleteSlide(i) }}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-block" onClick={addSlide}>
        + Add slide
      </button>
    </aside>
  )
}
