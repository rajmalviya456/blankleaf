import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { importFileList } from './actions'
import { decodeText } from './decodeText'

const bytes = (name: string, ...b: number[]) => new File([Uint8Array.from(b)], name)
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]

describe('decodeText', () => {
  it('reads UTF-16 marked with a byte order mark (PowerShell 5.1, Excel “Unicode Text”)', async () => {
    expect(await decodeText(bytes('ps.txt', 0xff, 0xfe, 0x48, 0, 0x69, 0))).toBe('Hi')
    expect(await decodeText(bytes('be.txt', 0xfe, 0xff, 0, 0x48, 0, 0x69))).toBe('Hi')
  })

  it('reads UTF-8, dropping a byte order mark', async () => {
    expect(await decodeText(new File(['Café – naïve'], 'u.txt'))).toBe('Café – naïve')
    expect(await decodeText(bytes('bom.txt', 0xef, 0xbb, 0xbf, 0x68, 0x69))).toBe('hi')
  })

  it('reads older Windows (“ANSI”) text that isn’t valid UTF-8 as Windows-1252', async () => {
    expect(await decodeText(bytes('c.txt', 0x43, 0x61, 0x66, 0xe9))).toBe('Café')
    expect(await decodeText(bytes('q.txt', 0x93, 0x68, 0x69, 0x94, 0x20, 0x80, 0x35))).toBe(
      '“hi” €5',
    )
  })
})

describe('importing files saved in other encodings', () => {
  const setup = () => {
    toastStore.getState().clear()
    const store = initStore(createAppStore())
    return (title: string) => Object.values(store.getState().notes).find((n) => n.title === title)
  }
  beforeEach(() => toastStore.getState().clear())

  it('opens UTF-16 with a byte order mark instead of calling it “not a text file”', async () => {
    const note = setup()
    await importFileList([bytes('ps.txt', 0xff, 0xfe, 0x48, 0, 0x69, 0)])
    expect(note('ps')?.content).toBe('Hi')
    expect(toastStore.getState().toasts).toHaveLength(0)
  })

  it('opens Windows-1252 text without replacement characters', async () => {
    const note = setup()
    await importFileList([bytes('c.txt', 0x43, 0x61, 0x66, 0xe9)])
    expect(note('c')?.content).toBe('Café')
  })

  it('drops a UTF-8 byte order mark', async () => {
    const note = setup()
    await importFileList([bytes('bom.txt', 0xef, 0xbb, 0xbf, 0x68, 0x69)])
    expect(note('bom')?.content).toBe('hi')
  })

  it('still refuses binary files', async () => {
    const note = setup()
    await importFileList([bytes('img.png', ...PNG)])
    expect(note('img')).toBeUndefined()
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/img\.png/)
  })
})
