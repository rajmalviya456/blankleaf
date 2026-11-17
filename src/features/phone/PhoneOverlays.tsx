/** Renders the phone overlays that are open, in stack order. Loaded lazily by PhoneShell. */
import { displayTitle } from '../../domain/title'
import { getStore } from '../../store/store'
import { ActionSheet } from './ActionSheet'
import { isTop, phoneStore, usePhone, type PhoneOverlay } from './phoneStore'
import { tabActionItems } from './tabActions'
import { TabsSheet } from './TabsSheet'

const has = (stack: PhoneOverlay[], o: PhoneOverlay) => stack.some((x) => x === o)

export default function PhoneOverlays() {
  const stack = usePhone((p) => p.stack)
  /** Close `o` if it's on top (Escape / drag / outside tap only ever target the top one). */
  const closer = (o: PhoneOverlay) => () => {
    if (isTop(phoneStore.getState().stack, o)) phoneStore.getState().close()
  }
  const actions = stack.filter(
    (o): o is Extract<PhoneOverlay, { kind: string }> => typeof o === 'object',
  )

  return (
    <>
      <TabsSheet open={has(stack, 'tabs')} onClose={closer('tabs')} />
      {actions.map((o) => {
        const note = getStore().getState().notes[o.noteId]
        if (!note) return null
        return (
          <ActionSheet
            key={`${o.kind}:${o.noteId}`}
            open
            title={displayTitle(note)}
            items={o.kind === 'tabActions' ? tabActionItems(o.noteId) : []}
            onClose={closer(o)}
          />
        )
      })}
    </>
  )
}
