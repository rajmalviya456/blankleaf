import { EditorState, EditorSelection } from '@codemirror/state'
import { indentUnit } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { applyTransform, TRANSFORMS, type TransformId } from './transforms'

const run = async (id: TransformId, text: string) => TRANSFORMS[id].run(text)

describe('text transforms', () => {
  it('formats and minifies JSON', async () => {
    expect(await run('json.format', '{"a":1,"b":[1,2]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}',
    )
    expect(await run('json.minify', '{\n  "a": 1\n}')).toBe('{"a":1}')
  })

  it('says what is wrong with invalid JSON', async () => {
    await expect(run('json.format', '{a:1}')).rejects.toThrow(/^Not valid JSON/)
  })

  it('converts JSON to YAML and back', async () => {
    expect(await run('json.toYaml', '{"name":"leaf","tags":["a","b"]}')).toBe(
      'name: leaf\ntags:\n  - a\n  - b\n',
    )
    expect(await run('yaml.toJson', 'name: leaf\ntags:\n  - a\n')).toBe(
      '{\n  "name": "leaf",\n  "tags": [\n    "a"\n  ]\n}',
    )
    await expect(run('yaml.toJson', 'a: [1, 2')).rejects.toThrow(/^Not valid YAML/)
  })

  it('Base64 round-trips any text, including emoji and accents', async () => {
    const enc = await run('base64.encode', 'héllo 🌿')
    expect(enc).toBe('aMOpbGxvIPCfjL8=')
    expect(await run('base64.decode', enc)).toBe('héllo 🌿')
    expect(await run('base64.decode', 'aMOpbGxvIPCfjL8')).toBe('héllo 🌿') // no padding
    await expect(run('base64.decode', '###')).rejects.toThrow(/^Not valid Base64/)
  })

  it('URL-encodes and decodes', async () => {
    expect(await run('url.encode', 'a b&c=é')).toBe('a%20b%26c%3D%C3%A9')
    expect(await run('url.decode', 'a%20b%26c%3D%C3%A9')).toBe('a b&c=é')
    await expect(run('url.decode', '%E0%A4%A')).rejects.toThrow(/^Not valid URL encoding/)
  })
})

describe('applyTransform', () => {
  const view = (doc: string, sel?: [number, number]) =>
    new EditorView({
      state: EditorState.create({
        doc,
        selection: sel ? EditorSelection.single(sel[0], sel[1]) : undefined,
      }),
    })

  it('transforms the whole note when nothing is selected', async () => {
    const v = view('{"a":1}')
    await applyTransform(v, 'json.format')
    expect(v.state.doc.toString()).toBe('{\n  "a": 1\n}')
  })

  it('formats JSON with the note’s indent width', async () => {
    const v = new EditorView({
      state: EditorState.create({ doc: '{"a":1}', extensions: [indentUnit.of('    ')] }),
    })
    await applyTransform(v, 'json.format')
    expect(v.state.doc.toString()).toBe('{\n    "a": 1\n}')
  })

  it('refuses JSON whose big numbers would be rounded', async () => {
    await expect(run('json.format', '{"id": 12345678901234567890}')).rejects.toThrow(/too large/)
    await expect(run('json.minify', '[9007199254740993]')).rejects.toThrow(/too large/)
    expect(await run('json.minify', '[9007199254740991, 1.5e300]')).toBe(
      '[9007199254740991,1.5e+300]',
    )
  })

  it('transforms only the selection', async () => {
    const v = view('id: aGk= end', [4, 8])
    await applyTransform(v, 'base64.decode')
    expect(v.state.doc.toString()).toBe('id: hi end')
  })
})
