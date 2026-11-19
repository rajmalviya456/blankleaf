import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { fileToNote, isProbablyBinary, noteExportFile } from './importFiles'

describe('fileToNote', () => {
  it('maps extensions to formats and names to titles', () => {
    expect(fileToNote('notes.md', '# hi', 5, DEFAULT_SETTINGS)).toMatchObject({
      title: 'notes',
      content: '# hi',
      mode: 'markdown',
      language: 'markdown',
      createdAt: 5,
      rev: 0,
    })
    expect(fileToNote('a.py', 'x', 5, DEFAULT_SETTINGS)).toMatchObject({
      language: 'python',
      wrap: false,
    })
    expect(fileToNote('server.log', 'x', 5, DEFAULT_SETTINGS).language).toBe('log')
    expect(fileToNote('README', 'x', 5, DEFAULT_SETTINGS)).toMatchObject({
      title: 'README',
      language: 'auto',
    })
    expect(fileToNote('user.rb', 'x', 5, DEFAULT_SETTINGS).language).toBe('ruby')
    expect(fileToNote('tasks.rake', 'x', 5, DEFAULT_SETTINGS).language).toBe('ruby')
    expect(fileToNote('Gemfile', 'x', 5, DEFAULT_SETTINGS).language).toBe('ruby')
    expect(fileToNote('Rakefile', 'x', 5, DEFAULT_SETTINGS).language).toBe('ruby')
    for (const [name, lang] of [
      ['App.kt', 'kotlin'],
      ['build.gradle.kts', 'kotlin'],
      ['Program.cs', 'csharp'],
      ['View.swift', 'swift'],
      ['init.lua', 'lua'],
      ['run.pl', 'perl'],
      ['deploy.ps1', 'powershell'],
      ['plot.R', 'r'],
      ['nginx.conf', 'nginx'],
      ['.env', 'ini'],
      ['app.properties', 'ini'],
      ['setup.cfg', 'ini'],
      ['main.scss', 'scss'],
      ['theme.less', 'less'],
    ])
      expect(fileToNote(name, 'x', 5, DEFAULT_SETTINGS).language, name).toBe(lang)
    expect(fileToNote('Dockerfile', 'FROM x', 5, DEFAULT_SETTINGS).language).toBe('dockerfile')
  })
})

describe('noteExportFile', () => {
  const draft = newNoteDraft(1, DEFAULT_SETTINGS)
  it('picks a file name and extension from title and format', () => {
    expect(noteExportFile({ ...draft, content: '' }).name).toBe('Untitled.txt')
    expect(
      noteExportFile({ ...draft, title: 'meeting notes', mode: 'markdown', language: 'markdown' })
        .name,
    ).toBe('meeting notes.md')
    expect(noteExportFile({ ...draft, title: 'a/b:c*?', language: 'python' }).name).toBe(
      'a-b-c--.py',
    )
    expect(noteExportFile({ ...draft, title: 'x', language: 'json' }).mime).toMatch(
      /^application\/json/,
    )
  })
})

describe('isProbablyBinary', () => {
  it('flags NUL bytes in the first 8KB', () => {
    expect(isProbablyBinary('hello')).toBe(false)
    expect(isProbablyBinary('PNG\0\0data')).toBe(true)
  })
})
