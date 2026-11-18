import { getStore } from '../../../store/store'
import { buttonClass, Row, Section } from '../controls'

export function AboutSection() {
  return (
    <Section title="About">
      <Row label={`Blankleaf ${__APP_VERSION__}`} hint="Notes are stored only in this browser.">
        <button
          type="button"
          className={buttonClass}
          onClick={() => getStore().getState().setUi({ settingsOpen: false, aboutOpen: true })}
        >
          About Blankleaf…
        </button>
      </Row>
    </Section>
  )
}
