import { ensureSyntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { EditorState } from '@codemirror/state'
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

describe('markdown fences', () => {
  it.each([
    ['js', 'const x = 1', 'JavaScript', 'VariableDeclaration'],
    ['python', 'def f():\n    return 1', 'Python', 'FunctionDefinition'],
  ])('parses ```%s blocks with that language', async (fence, code, langName, node) => {
    const { languages } = await import('@codemirror/language-data')
    // In the app the fence language loads on demand and CodeMirror re-parses when idle;
    // pre-loading here keeps the parse synchronous for the test.
    await languages.find((l) => l.name === langName)!.load()
    const ext = await loadLanguage('markdown')
    const state = EditorState.create({
      doc: `# T\n\n\`\`\`${fence}\n${code}\n\`\`\`\n`,
      extensions: [ext!],
    })
    // resolveInner enters nested (mounted) parses; iterate() alone stays in the markdown tree.
    const tree = ensureSyntaxTree(state, state.doc.length, 5000)!
    const names: string[] = []
    for (
      let n: SyntaxNode | null = tree.resolveInner(state.doc.toString().indexOf(code) + 1, 1);
      n;
      n = n.parent
    )
      names.push(n.name)
    expect(names).toContain(node)
  })
})
