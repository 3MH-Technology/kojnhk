'use client'
import * as React from 'react'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

let mermaidLoaded: Promise<void> | null = null
async function loadMermaid() {
  if (!mermaidLoaded) {
    mermaidLoaded = import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict', fontFamily: 'inherit' })
    })
  }
  return mermaidLoaded
}

export function Mermaid({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [svg, setSvg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const isDark = useTheme()

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadMermaid()
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'strict', fontFamily: 'inherit' })
        const id = `m-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, code)
        if (!cancelled) setSvg(svg)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Mermaid render error')
      }
    })()
    return () => { cancelled = true }
  }, [code, isDark])

  if (err) return <pre className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{err}</pre>
  if (!svg) return <div className="my-3 h-32 animate-pulse rounded-md bg-muted/50" />
  return <div className="my-3 overflow-x-auto rounded-lg border border-border bg-card p-3" ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
}
