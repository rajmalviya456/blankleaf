import { createContext, memo, useContext, useMemo, useState, type ComponentProps } from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { taskLabelAt } from '../checklist/taskToggle'

const link: Components['a'] = ({ node: _node, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer" />
)

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

const components: Components = { a: link, li: listItem, input: TaskBox }

/** Rendered Markdown (GFM). Output is sanitized: no scripts, handlers or javascript: links. */
export const MarkdownPreview = memo(function MarkdownPreview({
  source,
  className,
  onToggleTask,
}: {
  source: string
  className?: string
  /** Makes task-list boxes clickable: called with the ticked item's offset in the text. */
  onToggleTask?(offset: number): void
}) {
  const tasks = useMemo(() => ({ source, onToggleTask }), [source, onToggleTask])
  return (
    <Tasks.Provider value={tasks}>
      <article
        aria-label="Markdown preview"
        className={className ? `md-preview ${className}` : 'md-preview'}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          // Sanitize first (keeps only safe markup, incl. language-* classes), then highlight:
          // highlighting only wraps text in spans, so it can't reintroduce anything unsafe.
          rehypePlugins={[rehypeSanitize, [rehypeHighlight, { detect: false }]]}
          components={components}
        >
          {source}
        </ReactMarkdown>
      </article>
    </Tasks.Provider>
  )
})
