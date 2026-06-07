'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, History, Sparkles, FileText, Code2, FileCode2, RotateCcw, Download, GitCompare, X, Check } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Markdown } from '@/components/renderers/markdown'
import { CanvasRecord, CanvasVersion } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

const ICONS: Record<string, any> = { document: FileText, code: Code2, markdown: FileCode2, project: FileText, research: Sparkles }

const AUTOSAVE_DELAY = 1200

export default function CanvasDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [content, setContent] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [tab, setTab] = React.useState<'edit' | 'preview' | 'split'>('split')
  const [diffPair, setDiffPair] = React.useState<[number, number] | null>(null)
  const [diffText, setDiffText] = React.useState<string>('')
  const lastSavedRef = React.useRef('')
  const autosaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cQ = useQuery({
    queryKey: ['canvas', id],
    queryFn: async () => (await api.get<CanvasRecord>(`/canvas/${id}`)).data,
  })
  const vQ = useQuery({
    queryKey: ['canvas', id, 'versions'],
    queryFn: async () => (await api.get<CanvasVersion[]>(`/canvas/${id}/versions`)).data,
  })

  React.useEffect(() => {
    if (cQ.data) {
      setContent(cQ.data.content)
      setTitle(cQ.data.title)
      lastSavedRef.current = cQ.data.content + '|' + cQ.data.title
    }
  }, [cQ.data])

  const save = useMutation({
    mutationFn: async ({ title: t, content: c, message }: { title: string; content: string; message?: string }) =>
      (await api.patch<CanvasRecord>(`/canvas/${id}`, { title: t, content: c, commitMessage: message })).data,
    onSuccess: (d) => {
      lastSavedRef.current = d.content + '|' + d.title
      qc.invalidateQueries({ queryKey: ['canvas', id] })
      qc.invalidateQueries({ queryKey: ['canvas', id, 'versions'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  // Autosave
  React.useEffect(() => {
    if (!cQ.data) return
    if (content === cQ.data.content && title === cQ.data.title) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      save.mutate({ title, content, message: 'autosave' })
    }, AUTOSAVE_DELAY)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [content, title, cQ.data])

  const restore = useMutation({
    mutationFn: async (v: number) => (await api.post<CanvasRecord>(`/canvas/${id}/restore/${v}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas', id] })
      qc.invalidateQueries({ queryKey: ['canvas', id, 'versions'] })
      toast.success('Restored')
    },
  })

  const diff = useMutation({
    mutationFn: async ({ a, b }: { a: number; b: number }) =>
      (await api.get<{ diff: string }>(`/canvas/${id}/diff/${a}/${b}`)).data,
    onSuccess: (d) => setDiffText(d.diff || '(no changes)'),
  })

  React.useEffect(() => {
    if (diffPair) diff.mutate({ a: diffPair[0], b: diffPair[1] })
  }, [diffPair])

  const download = () => {
    const ext = cQ.data?.type === 'code' ? 'txt' : 'md'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'canvas').replace(/\W+/g, '-')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!id) return null
  const c = cQ.data
  const dirty = cQ.data ? (content + '|' + title) !== lastSavedRef.current : false

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button onClick={() => router.push('/canvas')} className="rounded p-1.5 hover:bg-accent">
          <FileText className="h-4 w-4" />
        </button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 max-w-md border-transparent bg-transparent text-sm font-medium focus-visible:ring-0"
        />
        <span className="ml-2 text-xs text-muted-foreground">v{c?.currentVersion ?? 1}</span>
        {save.isPending ? (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> saving…
          </span>
        ) : dirty ? (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> unsaved
          </span>
        ) : (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-600">
            <Check className="h-3 w-3" /> saved
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="ghost" onClick={download}><Download className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => save.mutate({ title, content, message: 'manual' })} disabled={save.isPending || !dirty}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'preview' ? (
            <div className="mx-auto max-w-3xl">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <div className={tab === 'split' ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : ''}>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={tab === 'split' ? 'min-h-[60vh] font-mono text-sm' : 'min-h-[70vh] font-mono text-sm'}
                placeholder="Start writing…"
              />
              {tab === 'split' && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <Markdown>{content || '*(empty)*'}</Markdown>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-border bg-muted/30 p-3 lg:block">
          <div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Versions
          </div>
          <div className="space-y-1">
            {(vQ.data || []).map((v) => (
              <Card key={v.version} className="bg-card">
                <CardContent className="flex items-center justify-between p-2 text-xs">
                  <div>
                    <div className="font-medium">v{v.version}</div>
                    <div className="text-[10px] text-muted-foreground">{formatRelative(v.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {v.version !== c?.currentVersion && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Compare with current"
                          onClick={() => setDiffPair([v.version, c?.currentVersion || v.version + 1])}>
                          <GitCompare className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Restore" onClick={() => restore.mutate(v.version)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </aside>
      </div>

      <Dialog open={!!diffPair} onOpenChange={(o) => !o && setDiffPair(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Diff: v{diffPair?.[0]} → v{diffPair?.[1]}</DialogTitle>
            <DialogDescription>Unified diff between the two versions.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
{diffText || (diff.isPending ? 'Loading…' : '(no diff)')}
          </pre>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiffPair(null)}><X className="h-4 w-4" /> Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
