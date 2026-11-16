import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/** Syntax colors as CSS variables (defined per theme in index.css). */
export const calmHighlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword],
    color: 'var(--syn-keyword)',
  },
  { tag: [t.string, t.special(t.string), t.regexp, t.inserted], color: 'var(--syn-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: 'var(--syn-comment)',
    fontStyle: 'italic',
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    color: 'var(--syn-function)',
  },
  { tag: [t.typeName, t.className, t.namespace, t.tagName], color: 'var(--syn-type)' },
  { tag: [t.propertyName, t.attributeName, t.labelName], color: 'var(--syn-property)' },
  { tag: [t.meta, t.processingInstruction, t.annotation], color: 'var(--syn-meta)' },
  { tag: [t.invalid, t.deleted], color: 'var(--danger)' },
  { tag: [t.heading], color: 'var(--syn-keyword)', fontWeight: '600' },
  { tag: [t.monospace], color: 'var(--syn-string)' },
  { tag: [t.quote], color: 'var(--fg-muted)', fontStyle: 'italic' },
  { tag: [t.list], color: 'var(--syn-number)' },
  { tag: [t.contentSeparator], color: 'var(--syn-punct)' },
  { tag: [t.strikethrough], textDecoration: 'line-through' },
  { tag: [t.strong], fontWeight: '600' },
  { tag: [t.emphasis], fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--accent)', textDecoration: 'underline' },
  { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--syn-punct)' },
])

export const calmSyntax = syntaxHighlighting(calmHighlightStyle)
