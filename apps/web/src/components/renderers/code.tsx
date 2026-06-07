'use client'
import * as React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'

export function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = React.useState(false)
  const theme = useUIStore((s) => s.theme)
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const onCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5 text-xs">
        <span className="font-mono text-muted-foreground">{language || 'text'}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={onCopy}>
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDark ? oneDark : oneLight}
        customStyle={{ margin: 0, padding: '0.9rem 1rem', background: 'transparent', fontSize: '0.85rem' }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
}
