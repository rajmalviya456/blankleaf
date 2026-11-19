import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import nginx from 'highlight.js/lib/languages/nginx'
import powershell from 'highlight.js/lib/languages/powershell'
import { common } from 'lowlight'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { taskLabelAt } from '../checklist/taskToggle'
import { NOTE_HREF, remarkNoteLinks } from '../links/remarkNoteLinks'
import { Diagram, ReadyDiagrams } from './Diagram'
import { loadMath, needsMath, type MathPlugins, type RichExtras } from './richContent'

/** Opens `[[Title]]` links as notes; only given in the editor's own preview. */
const NoteLinkOpener = createContext<((title: string) => void) | null>(null)

function Link({ node: _node, href, ...props }: ComponentProps<'a'> & ExtraProps) {
  const openNote = useContext(NoteLinkOpener)
  if (openNote && href?.startsWith(NOTE_HREF)) {
    const title = decodeURIComponent(href.slice(NOTE_HREF.length))
    return (
      <a
        {...props}
        href={href}
        className="np-note-link"
        onClick={(e) => {
          e.preventDefault()
          openNote(title)
        }}
      />
    )
  }
  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" />
}
const link: Components['a'] = Link

/** The source offset of the task item a checkbox belongs to (set by its <li>). */
const TaskItem = createContext<number | null>(null)
const Tasks = createContext<{ source: string; onToggleTask?(offset: number): void } | null>(null)

const listItem: Components['li'] = ({ node, children, ...props }) => {
  const offset = String(props.className ?? '').includes('task-list-item')
    ? (node?.position?.start.offset ?? null)
    : null
  return (
    <TaskItem.Provider value={offset}>
      <li {...props}>{children}</li>
    </TaskItem.Provider>
  )
}

/** Task boxes tick and untick the note's text, when the preview is editable. */
/** highlight.js's common set, plus formats the editor highlights that it leaves out. */
const FENCE_LANGUAGES = { ...common, dockerfile, nginx, powershell }

function TaskBox({ node: _node, ...props }: ComponentProps<'input'> & ExtraProps) {
  const offset = useContext(TaskItem)
  const tasks = useContext(Tasks)
  // Show a tick at once: the rendered text catches up a moment later (and this then expires).
  const [ticked, setTicked] = useState<{ from: boolean; to: boolean } | null>(null)
  if (props.type !== 'checkbox' || offset === null || !tasks?.onToggleTask)
    return <input {...props} />
  const { source, onToggleTask } = tasks
  const rendered = !!props.checked
  const checked = ticked?.from === rendered ? ticked.to : rendered
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={taskLabelAt(source, offset) ?? undefined}
      onChange={() => {
        setTicked({ from: rendered, to: !checked })
        onToggleTask(offset)
      }}
      className="cursor-pointer"
    />
  )
}

type HastNode = {
  type: string
  value?: string
  tagName?: string
  children?: HastNode[]
  properties?: { className?: unknown }
}
const textOf = (n: HastNode): string => n.value ?? (n.children ?? []).map(textOf).join('')

/** A ```mermaid block becomes a drawing; every other code block stays as it is. */
const preBlock: Components['pre'] = ({ node, children, ...props }) => {
  const code = (node as HastNode | undefined)?.children?.find((c) => c.tagName === 'code')
  const classes = code?.properties?.className
  if (code && Array.isArray(classes) && classes.includes('language-mermaid'))
    return <Diagram code={textOf(code).replace(/\n$/, '')} />
  return <pre {...props}>{children}</pre>
}

const components: Components = { a: link, li: listItem, input: TaskBox, pre: preBlock }

/** Loading an outside image would tell its site who opened the note, so it becomes a link. */
const imageAsLink: Components['img'] = ({ src, alt }) =>
  typeof src === 'string' && /^https?:/i.test(src) ? (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {alt || 'Image'} (image link)
    </a>
  ) : null
const noRemoteImages: Components = { ...components, img: imageAsLink }

/** Math plugins for this text: given up front (static copies) or loaded when first needed. */
function useMath(source: string, given?: MathPlugins): MathPlugins | undefined {
  const wanted = !given && needsMath(source)
  const [loaded, setLoaded] = useState<MathPlugins>()
  useEffect(() => {
    if (!wanted) return
    let alive = true
    void loadMath().then((m) => alive && setLoaded(m))
    return () => {
      alive = false
    }
  }, [wanted])
  return given ?? (wanted ? loaded : undefined)
}

/** Rendered Markdown (GFM). Output is sanitized: no scripts, handlers or javascript: links. */
export const MarkdownPreview = memo(function MarkdownPreview({
  source,
  className,
  onToggleTask,
  extras,
  remoteImages = true,
  onOpenNote,
}: {
  source: string
  className?: string
  /** Makes task-list boxes clickable: called with the ticked item's offset in the text. */
  onToggleTask?(offset: number): void
  /** Math and diagrams prepared in advance, for print and export. */
  extras?: RichExtras
  /** False for notes from other people and for exported pages. */
  remoteImages?: boolean
  /** Makes `[[Title]]` links open notes. Left out for shared, printed and exported notes. */
  onOpenNote?(title: string): void
}) {
  const math = useMath(source, extras?.math)
  const tasks = useMemo(() => ({ source, onToggleTask }), [source, onToggleTask])
  return (
    <ReadyDiagrams.Provider value={extras?.diagrams}>
      <NoteLinkOpener.Provider value={onOpenNote ?? null}>
        <Tasks.Provider value={tasks}>
          <article
            aria-label="Markdown preview"
            className={className ? `md-preview ${className}` : 'md-preview'}
          >
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                ...(onOpenNote ? [remarkNoteLinks] : []),
                ...(math?.remark ?? []),
              ]}
              // Sanitize first (keeps only safe markup, incl. language-* classes), then highlight:
              // highlighting only wraps text in spans, so it can't reintroduce anything unsafe.
              rehypePlugins={[
                rehypeSanitize,
                ...(math?.rehype ?? []),
                [rehypeHighlight, { detect: false, languages: FENCE_LANGUAGES }],
              ]}
              components={remoteImages ? components : noRemoteImages}
            >
              {source}
            </ReactMarkdown>
          </article>
        </Tasks.Provider>
      </NoteLinkOpener.Provider>
    </ReadyDiagrams.Provider>
  )
})
