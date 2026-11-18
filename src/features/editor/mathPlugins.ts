/**
 * Math in Markdown, loaded only for notes that use it. Math is written as $$x^2$$ or in a
 * ```math block: single dollars stay plain text, so prices like $5 and $10 are never mangled.
 * KaTeX outputs MathML, which browsers draw themselves, so exports need no fonts or styles.
 */
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import type { PluggableList } from 'unified'

export const remarkMathPlugins: PluggableList = [[remarkMath, { singleDollarTextMath: false }]]
export const rehypeMathPlugins: PluggableList = [
  [rehypeKatex, { output: 'mathml', throwOnError: false, strict: 'ignore', trust: false }],
]
