import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value)
        if (!Number.isNaN(v)) onChange(v)
      }}
    />
  )
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="color-input">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{value}</span>
    </div>
  )
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function SliderInput({
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
