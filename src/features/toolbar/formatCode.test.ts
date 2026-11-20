import { describe, expect, it } from 'vitest'
import { canFormat, formatCode } from './formatCode'
import { TransformError } from './transforms'

describe('formatCode', () => {
  it('formats JavaScript and TypeScript', async () => {
    expect(await formatCode('const a={b:1,c:[1,2]}', 'javascript')).toBe(
      'const a = { b: 1, c: [1, 2] };\n',
    )
    expect(await formatCode('function f(x:number){return x*2}', 'typescript')).toBe(
      'function f(x: number) {\n  return x * 2;\n}\n',
    )
  })

  it('formats CSS, SCSS and Less', async () => {
    expect(await formatCode('a{color:red;margin:0}', 'css')).toBe(
      'a {\n  color: red;\n  margin: 0;\n}\n',
    )
    expect(await formatCode('.a{.b{color:red}}', 'scss')).toBe(
      '.a {\n  .b {\n    color: red;\n  }\n}\n',
    )
    expect(await formatCode('@c:red;.a{color:@c}', 'less')).toContain('color: @c;')
  })

  it('formats HTML', async () => {
    expect(await formatCode('<div><p>Hi</p></div>', 'html')).toBe('<div><p>Hi</p></div>\n')
    expect(await formatCode('<ul><li>a</li><li>b</li></ul>', 'html')).toContain('<li>a</li>')
  })

  it('formats SQL with capital keywords', async () => {
    expect(await formatCode('select id,name from users where id=1', 'sql')).toBe(
      'SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  id = 1',
    )
  })

  it('formats YAML and Markdown', async () => {
    expect(await formatCode('a:   1\nb:\n    - x', 'yaml')).toBe('a: 1\nb:\n  - x\n')
    expect(await formatCode('#  Title\n*  one\n*  two', 'markdown')).toBe(
      '# Title\n\n- one\n- two\n',
    )
  })

  it('uses the note’s indent', async () => {
    expect(await formatCode('if(a){b()}', 'javascript', '    ')).toBe('if (a) {\n    b();\n}\n')
    expect(await formatCode('if(a){b()}', 'javascript', '\t')).toBe('if (a) {\n\tb();\n}\n')
  })

  it('explains code it can’t read, with the line', async () => {
    const e = await formatCode('const a = {\n  b: ', 'javascript').catch((x) => x)
    expect(e).toBeInstanceOf(TransformError)
    expect(e.message).toMatch(/^Couldn’t format: .*line 2/)
  })

  it('knows which formats it can do', () => {
    for (const id of [
      'javascript',
      'typescript',
      'css',
      'scss',
      'less',
      'html',
      'sql',
      'yaml',
      'markdown',
    ] as const)
      expect(canFormat(id)).toBe(true)
    for (const id of ['python', 'auto', 'plaintext', 'json'] as const)
      expect(canFormat(id)).toBe(false)
  })
})
