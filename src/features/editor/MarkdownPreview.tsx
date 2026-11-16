import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
}

/** Rendered Markdown (GFM). Output is sanitized: no scripts, handlers or javascript: links. */
export const MarkdownPreview = memo(function MarkdownPreview({ source }: { source: string }) {
  return (
    <article aria-label="Markdown preview" className="md-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </article>
  )
})
