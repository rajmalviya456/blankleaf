/**
 * Spell check languages. Only dictionaries that load quickly and lightly are offered: French,
 * German, Italian and others take seconds and hundreds of MB with this checker (or never finish),
 * which would freeze or crash a phone.
 */
export type SpellLanguage = 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'es'
export type SpellLanguageSetting = 'auto' | SpellLanguage

export const SPELL_LANGUAGES: readonly { id: SpellLanguage; label: string; pkg: string }[] = [
  { id: 'en-US', label: 'English (US)', pkg: 'dictionary-en' },
  { id: 'en-GB', label: 'English (UK)', pkg: 'dictionary-en-gb' },
  { id: 'en-AU', label: 'English (Australia)', pkg: 'dictionary-en-au' },
  { id: 'en-CA', label: 'English (Canada)', pkg: 'dictionary-en-ca' },
  { id: 'es', label: 'Spanish', pkg: 'dictionary-es' },
]

/** English-speaking places that spell like Britain or Australia. */
const LIKE: Record<string, SpellLanguage> = {
  'en-gb': 'en-GB',
  'en-ie': 'en-GB',
  'en-in': 'en-GB',
  'en-za': 'en-GB',
  'en-au': 'en-AU',
  'en-nz': 'en-AU',
  'en-ca': 'en-CA',
}

/** Some browsers (and embedded views) have no list, only a single language, or neither. */
function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  if (Array.isArray(navigator.languages) && navigator.languages.length) return navigator.languages
  return navigator.language ? [navigator.language] : []
}

/** The dictionary to use: the chosen one, or the first of the browser's languages we have. */
export function resolveSpellLanguage(
  setting: SpellLanguageSetting,
  browser: readonly string[] | undefined = browserLanguages(),
): SpellLanguage {
  if (setting !== 'auto') return setting
  for (const tag of browser ?? []) {
    const t = tag.toLowerCase()
    if (LIKE[t]) return LIKE[t]
    if (t.startsWith('es')) return 'es'
    if (t.startsWith('en')) return 'en-US'
  }
  return 'en-US'
}
