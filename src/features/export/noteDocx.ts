/** A note as a real Word document, with Markdown turned into Word's own formatting. */
import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx'
import type { List, ListItem, PhrasingContent, RootContent, Table as MdTable } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { languageMeta } from '../../domain/languages'
import { documentTitle } from '../../domain/title'
import type { Note } from '../../domain/types'

const MONO = 'Consolas'
const CODE_SHADING = { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F4F7' }
const PAGE_WIDTH = 9026 // A4 text width, in twentieths of a point
const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

interface Marks {
  bold?: boolean
  italics?: boolean
  strike?: boolean
}
type Block = Paragraph | Table
interface Context {
  level: number
  quote: boolean
  /** Numbers each ordered list separately, so every list starts at 1. */
  lists: { count: number }
}

const isSafeLink = (url: string) => /^(https?:|mailto:)/i.test(url)

function inline(nodes: PhrasingContent[], marks: Marks = {}): ParagraphChild[] {
  return nodes.flatMap((n): ParagraphChild[] => {
    switch (n.type) {
      case 'text':
        return [new TextRun({ text: n.value.replace(/\n/g, ' '), ...marks })]
      case 'strong':
        return inline(n.children, { ...marks, bold: true })
      case 'emphasis':
        return inline(n.children, { ...marks, italics: true })
      case 'delete':
        return inline(n.children, { ...marks, strike: true })
      case 'inlineCode':
        return [new TextRun({ text: n.value, font: MONO, shading: CODE_SHADING, ...marks })]
      case 'break':
        return [new TextRun({ break: 1 })]
      case 'link': {
        if (!isSafeLink(n.url)) return inline(n.children, marks)
        const children = n.children.flatMap((c) =>
          c.type === 'text'
            ? [new TextRun({ text: c.value, style: 'Hyperlink', ...marks })]
            : inline([c], marks),
        )
        return [new ExternalHyperlink({ link: n.url, children })]
      }
      // Images are never fetched: a document shouldn't reach out to other sites.
      case 'image':
      case 'imageReference':
        return n.alt ? [new TextRun({ text: `[${n.alt}]`, italics: true })] : []
      case 'html':
        return [new TextRun({ text: n.value, ...marks })]
      default:
        return 'children' in n ? inline(n.children as PhrasingContent[], marks) : []
    }
  })
}

const quoteStyle = (ctx: Context) =>
  ctx.quote
    ? {
        indent: { left: 400 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9CED6', space: 10 } },
      }
    : {}

function list(node: List, ctx: Context): Block[] {
  const instance = ++ctx.lists.count
  const level = Math.min(ctx.level, 8)
  return node.children.flatMap((item: ListItem) => {
    const [first, ...rest] = item.children
    const box = item.checked === null || item.checked === undefined ? null : item.checked
    const marker =
      box !== null
        ? { indent: { left: 360 * (level + 1) } }
        : node.ordered
          ? { numbering: { reference: 'ordered', level, instance } }
          : { bullet: { level } }
    const text = first?.type === 'paragraph' ? inline(first.children) : []
    const prefix = box === null ? [] : [new TextRun({ text: box ? '☑ ' : '☐ ' })]
    return [
      new Paragraph({ ...marker, children: [...prefix, ...text] }),
      ...blocks(first?.type === 'paragraph' ? rest : item.children, {
        ...ctx,
        level: ctx.level + 1,
      }),
    ]
  })
}

function table(node: MdTable): Table {
  const columns = Math.max(1, ...node.children.map((r) => r.children.length))
  const width = Math.floor(PAGE_WIDTH / columns)
  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: Array<number>(columns).fill(width),
    rows: node.children.map(
      (row, r) =>
        new TableRow({
          tableHeader: r === 0,
          children: row.children.map(
            (cell) =>
              new TableCell({
                width: { size: width, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [
                  new Paragraph({ children: inline(cell.children, r === 0 ? { bold: true } : {}) }),
                ],
              }),
          ),
        }),
    ),
  })
}

function blocks(nodes: RootContent[], ctx: Context): Block[] {
  return nodes.flatMap((n): Block[] => {
    switch (n.type) {
      case 'heading':
        return [new Paragraph({ heading: HEADINGS[n.depth - 1], children: inline(n.children) })]
      case 'paragraph':
        return [
          new Paragraph({
            ...quoteStyle(ctx),
            spacing: { after: 160 },
            children: inline(n.children),
          }),
        ]
      case 'list':
        return list(n, ctx)
      case 'blockquote':
        return blocks(n.children, { ...ctx, quote: true })
      case 'code':
        return n.value.split('\n').map(
          (line) =>
            new Paragraph({
              shading: CODE_SHADING,
              spacing: { after: 0 },
              children: [new TextRun({ text: line, font: MONO, size: 20 })],
            }),
        )
      case 'table':
        return [table(n), new Paragraph({})]
      case 'thematicBreak':
        return [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9CED6', space: 1 } },
          }),
        ]
      case 'html':
        return [new Paragraph({ children: [new TextRun({ text: n.value })] })]
      default:
        return []
    }
  })
}

function plainBlocks(note: Note): Block[] {
  const lang = note.language === 'auto' ? 'plaintext' : note.language
  const font = languageMeta(lang).kind === 'text' ? undefined : MONO
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(documentTitle(note))] }),
    ...note.content.split('\n').map(
      (line) =>
        new Paragraph({
          spacing: { after: 0 },
          children: line ? [new TextRun({ text: line, font })] : [],
        }),
    ),
  ]
}

export function noteToDocx(note: Note): Promise<Blob> {
  const children =
    note.mode === 'markdown'
      ? blocks(unified().use(remarkParse).use(remarkGfm).parse(note.content).children, {
          level: 0,
          quote: false,
          lists: { count: 0 },
        })
      : plainBlocks(note)
  return Packer.toBlob(
    new Document({
      title: documentTitle(note),
      creator: 'Blankleaf',
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      numbering: {
        config: [
          {
            reference: 'ordered',
            levels: Array.from({ length: 9 }, (_, level) => ({
              level,
              format: LevelFormat.DECIMAL,
              text: `%${level + 1}.`,
              style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
            })),
          },
        ],
      },
      sections: [{ children }],
    }),
  )
}
