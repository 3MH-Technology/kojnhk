'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { SystemPromptRecord } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { toast } from 'sonner'

export function PromptManager() {
  const qc = useQueryClient()
  const listQ = useQuery({
    queryKey: ['system-prompts'],
    queryFn: async () => (await api.get<SystemPromptRecord[]>('/system-prompts')).data,
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">System prompts</h1>
          <p className="text-sm text-muted-foreground">Only admins see this page or the prompt content. Users never receive the raw prompt.</p>
        </div>
        <NewPromptButton />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {(listQ.data || []).map((p) => <PromptCard key={p.id} prompt={p} />)}
        {(listQ.data || []).length === 0 && <div className="text-sm text-muted-foreground">No prompts yet.</div>}
      </div>
    </div>
  )
}

function NewPromptButton() {
  const qc = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [content, setContent] = React.useState('')
  const [description, setDescription] = React.useState('')
  const create = useMutation({
    mutationFn: async () => (await api.post('/system-prompts', { name, content, description })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-prompts'] }); setOpen(false); setName(''); setContent('') },
  })
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New prompt</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New system prompt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[180px] font-mono text-sm" placeholder="You are …" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!name || !content}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PromptCard({ prompt }: { prompt: SystemPromptRecord }) {
  const qc = useQueryClient()
  const [editing, setEditing] = React.useState(false)
  const [content, setContent] = React.useState(prompt.versions.find((v) => v.version === prompt.currentVersion)?.content || '')
  const [changelog, setChangelog] = React.useState('')
  const update = useMutation({
    mutationFn: async () => (await api.patch(`/system-prompts/${prompt.id}`, { content, changelog })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-prompts'] }); setEditing(false); toast.success('New version saved') },
  })
  const remove = useMutation({
    mutationFn: async () => { await api.delete(`/system-prompts/${prompt.id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-prompts'] }),
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{prompt.name}</CardTitle>
            {prompt.description && <p className="text-xs text-muted-foreground">{prompt.description}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Badge>v{prompt.currentVersion}</Badge>
            <Badge variant={prompt.active ? 'success' : 'secondary'}>{prompt.active ? 'active' : 'inactive'}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
{content}
        </pre>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing((s) => !s)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this prompt?')) remove.mutate() }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{prompt.versions.length} versions · updated {formatRelative(prompt.updatedAt)}</span>
        </div>
        {editing && (
          <div className="space-y-2 rounded-md border border-border bg-card p-2">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[180px] font-mono text-sm" />
            <Input value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="Changelog for this version (optional)" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending}>Save new version</Button>
            </div>
          </div>
        )}
        {prompt.versions.length > 1 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Version history</summary>
            <ul className="mt-1 space-y-1">
              {prompt.versions.slice().reverse().map((v) => (
                <li key={v.version} className="flex items-center gap-2 rounded border border-border/50 bg-muted/20 p-1.5">
                  <Badge variant="outline">v{v.version}</Badge>
                  <span className="truncate flex-1">{v.changelog || '—'}</span>
                  <span className="text-muted-foreground">{formatRelative(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
