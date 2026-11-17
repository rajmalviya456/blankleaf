import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
}

/** Rendered Markdown (GFM). Output is sanitized: no scripts, handlers or javascript: links. */
export const MarkdownPreview = memo(function MarkdownPreview({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  return (
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
  )
})
