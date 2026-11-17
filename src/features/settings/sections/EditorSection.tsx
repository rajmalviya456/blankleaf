import type { Settings } from '../../../domain/types'
import { Row, Section, SelectBox, Toggle } from '../controls'

interface Props {
  settings: Settings
  update(p: Partial<Settings>): void
}

export function EditorSection({ settings: s, update }: Props) {
  return (
    <Section title="Editor">
      <Row label="New notes start as" hint="Format auto-detection still applies once you type.">
        <SelectBox
          label="New notes start as"
          value={s.defaultMode}
          onChange={(defaultMode) => update({ defaultMode })}
          options={[
            { value: 'plain', label: 'Plain text' },
            { value: 'markdown', label: 'Markdown' },
          ]}
        />
      </Row>
      <Row label="Wrap long lines in new notes">
        <Toggle
          label="Wrap long lines in new notes"
          checked={s.defaultWrap}
          onChange={(defaultWrap) => update({ defaultWrap })}
        />
      </Row>
      <Row label="Show toolbar">
        <Toggle
          label="Show toolbar"
          checked={s.showToolbar}
          onChange={(showToolbar) => update({ showToolbar })}
        />
      </Row>
      <Row label="Line numbers">
        <Toggle
          label="Line numbers"
          checked={s.lineNumbers}
          onChange={(lineNumbers) => update({ lineNumbers })}
        />
      </Row>
      <Row label="Highlight current line">
        <Toggle
          label="Highlight current line"
          checked={s.highlightActiveLine}
          onChange={(highlightActiveLine) => update({ highlightActiveLine })}
        />
      </Row>
      <Row label="Tab size">
        <SelectBox
          label="Tab size"
          value={s.tabSize}
          onChange={(tabSize) => update({ tabSize })}
          options={[2, 4, 8].map((n) => ({ value: n, label: `${n} spaces` }))}
        />
      </Row>
    </Section>
  )
}
