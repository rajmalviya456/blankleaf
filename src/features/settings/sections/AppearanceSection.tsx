import { Minus, Plus } from 'lucide-react'
import { EDITOR_FONT_MAX, EDITOR_FONT_MIN } from '../../../domain/defaults'
import type { Settings } from '../../../domain/types'
import { buttonClass, Row, Section, Segmented } from '../controls'

const ACCENTS: { value: string; label: string }[] = [
  { value: '', label: 'Default blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#22a55b', label: 'Green' },
  { value: '#f08c2e', label: 'Orange' },
  { value: '#e0559b', label: 'Pink' },
]

interface Props {
  settings: Settings
  update(p: Partial<Settings>): void
}

export function AppearanceSection({ settings: s, update }: Props) {
  const setFont = (n: number) =>
    update({ editorFontSize: Math.min(EDITOR_FONT_MAX, Math.max(EDITOR_FONT_MIN, n)) })

  return (
    <Section title="Appearance">
      <Row label="Theme">
        <Segmented
          label="Theme"
          value={s.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Row>
      <Row label="Accent colour">
        <div role="radiogroup" aria-label="Accent colour" className="flex gap-1.5">
          {ACCENTS.map((a) => (
            <button
              key={a.label}
              type="button"
              role="radio"
              aria-checked={s.accent === a.value}
              aria-label={a.label}
              title={a.label}
              onClick={() => update({ accent: a.value })}
              className="size-5 rounded-full outline-none ring-offset-2 ring-offset-bg aria-checked:ring-2 aria-checked:ring-fg-muted focus-visible:ring-2 focus-visible:ring-accent"
              style={{ background: a.value || '#5b7cff' }}
            />
          ))}
        </div>
      </Row>
      <Row label="Editor font" hint="Monospace lines up code and logs; sans reads nicer for prose.">
        <Segmented
          label="Editor font"
          value={s.editorFont}
          onChange={(editorFont) => update({ editorFont })}
          options={[
            { value: 'mono', label: 'Monospace' },
            { value: 'sans', label: 'Sans' },
          ]}
        />
      </Row>
      <Row label="Editor font size" htmlFor="editor-font-size">
        <button
          type="button"
          aria-label="Decrease editor font size"
          onClick={() => setFont(s.editorFontSize - 1)}
          className={buttonClass + ' px-1.5'}
        >
          <Minus size={12} />
        </button>
        <input
          id="editor-font-size"
          type="range"
          aria-label="Editor font size"
          min={EDITOR_FONT_MIN}
          max={EDITOR_FONT_MAX}
          step={1}
          value={s.editorFontSize}
          onChange={(e) => setFont(Number(e.target.value))}
          className="w-28 accent-[var(--accent)]"
        />
        <button
          type="button"
          aria-label="Increase editor font size"
          onClick={() => setFont(s.editorFontSize + 1)}
          className={buttonClass + ' px-1.5'}
        >
          <Plus size={12} />
        </button>
        <span className="w-9 text-right text-[12px] tabular-nums text-fg-muted">
          {s.editorFontSize}px
        </span>
      </Row>
      <Row label="Line height" htmlFor="line-height">
        <input
          id="line-height"
          type="range"
          aria-label="Line height"
          min={1.2}
          max={2.2}
          step={0.1}
          value={s.lineHeight}
          onChange={(e) => update({ lineHeight: Math.round(Number(e.target.value) * 10) / 10 })}
          className="w-28 accent-[var(--accent)]"
        />
        <span className="w-9 text-right text-[12px] tabular-nums text-fg-muted">
          {s.lineHeight.toFixed(1)}
        </span>
      </Row>
      <Row label="Interface size">
        <Segmented
          label="Interface size"
          value={s.uiFontSize}
          onChange={(uiFontSize) => update({ uiFontSize })}
          options={[
            { value: 12, label: 'S' },
            { value: 13, label: 'M' },
            { value: 14, label: 'L' },
            { value: 15, label: 'XL' },
          ]}
        />
      </Row>
    </Section>
  )
}
