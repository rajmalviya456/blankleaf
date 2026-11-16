import { LANGUAGES } from '../../domain/languages'
import { loadLanguage } from './languages'

describe('loadLanguage', () => {
  it('every LANGUAGES id loads an extension, except plain text', async () => {
    for (const { id } of LANGUAGES) {
      const ext = await loadLanguage(id)
      if (id === 'plaintext') expect(ext).toBeNull()
      else expect(ext, id).not.toBeNull()
    }
  })

  it('auto resolves to no language', async () => {
    expect(await loadLanguage('auto')).toBeNull()
  })
})
