import { Section } from '../controls'

export function AboutSection() {
  return (
    <Section title="About">
      <div className="space-y-1 px-3 py-3 text-[12px] text-fg-muted">
        <p>
          <span className="text-fg">Notepadz</span> {__APP_VERSION__}
        </p>
        <p>
          Your notes live only in this browser’s storage. No account, no server, nothing is sent
          anywhere.
        </p>
      </div>
    </Section>
  )
}
