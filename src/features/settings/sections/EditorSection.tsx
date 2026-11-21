import type { Settings } from '../../../domain/types'
import { SPELL_LANGUAGES } from '../../spell/languages'
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
      <Row
        label="Live Markdown"
        hint="Markdown notes look formatted as you type: bold looks bold, headings look big. The ** and # marks show on the line you’re editing."
      >
        <Toggle
          label="Live Markdown"
          checked={s.liveMarkdown}
          onChange={(liveMarkdown) => update({ liveMarkdown })}
        />
      </Row>
      <Row label="Spell check" hint="Underlines misspelled words in every note.">
        <Toggle
          label="Spell check"
          checked={s.spellcheck}
          onChange={(spellcheck) => update({ spellcheck })}
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
      <Row label="Code ruler" hint="A faint line in code notes, to keep lines short.">
        <SelectBox
          label="Code ruler"
          value={s.codeRuler}
          onChange={(codeRuler) => update({ codeRuler })}
          options={[
            { value: 0, label: 'Off' },
            ...[80, 100, 120].map((n) => ({ value: n, label: `${n} characters` })),
          ]}
        />
      </Row>
      <Row
        label="Spell check language"
        hint="For notes with spell check on. The dictionary downloads the first time it's used."
      >
        <SelectBox
          label="Spell check language"
          value={s.spellLanguage}
          onChange={(spellLanguage) => update({ spellLanguage })}
          options={[
            { value: 'auto', label: 'Automatic' },
            ...SPELL_LANGUAGES.map((l) => ({ value: l.id, label: l.label })),
          ]}
        />
      </Row>
    </Section>
  )
}
