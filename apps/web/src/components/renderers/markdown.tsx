'use client'
import * as React from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { CodeBlock, InlineCode } from './code'
import { Mermaid } from './mermaid'
import { cn } from '@/lib/utils'

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    span: [...(defaultSchema.attributes?.span || []), ['className']],
    div: [...(defaultSchema.attributes?.div || []), ['className']],
  },
}

function extractCode(children: React.ReactNode): { lang: string; code: string } | null {
  const child = Array.isArray(children) ? children[0] : children
  if (React.isValidElement(child) && (child as any).type === 'code') {
    const props: any = (child as any).props || {}
    const className: string = props.className || ''
    const lang = (className.match(/language-(\S+)/)?.[1] || '').toLowerCase()
    const text = String(props.children || '').replace(/\n$/, '')
    return { lang, code: text }
  }
  return null
}

const components: Components = {
  code({ inline, className, children, ...props }: any) {
    if (inline) {
      return <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]', className)} {...props}>{children}</code>
    }
    const lang = (className?.match?.(/language-(\S+)/)?.[1] || '').toLowerCase()
    const code = String(children).replace(/\n$/, '')
    if (lang === 'mermaid') return <Mermaid code={code} />
    return <CodeBlock language={lang} code={code} />
  },
  pre({ children }: any) {
    const extracted = extractCode(children)
    if (extracted) {
      if (extracted.lang === 'mermaid') return <Mermaid code={extracted.code} />
      return <CodeBlock language={extracted.lang} code={extracted.code} />
    }
    return <pre className="my-3 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-sm">{children}</pre>
  },
  a({ children, ...props }) {
    return <a {...props} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-2 hover:underline">{children}</a>
  },
  table({ children }) {
    return <div className="my-3 overflow-x-auto rounded-md border border-border"><table className="w-full text-sm">{children}</table></div>
  },
  th({ children }) { return <th className="border-b border-border bg-muted/40 px-3 py-2 text-left text-xs font-semibold">{children}</th> },
  td({ children }) { return <td className="border-b border-border px-3 py-2 text-sm">{children}</td> },
  blockquote({ children }) {
    return <blockquote className="my-3 border-l-2 border-primary/40 pl-3 italic text-muted-foreground">{children}</blockquote>
  },
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-wormgpt break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
