'use client'
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Code2, FileCode2, Briefcase, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CanvasType } from '@/lib/types'

const TYPES: { type: CanvasType; label: string; icon: any; desc: string }[] = [
  { type: 'document', label: 'Document', icon: FileText, desc: 'Long-form writing' },
  { type: 'code', label: 'Code', icon: Code2, desc: 'Source code workspace' },
  { type: 'markdown', label: 'Markdown', icon: FileCode2, desc: 'Rich markdown editing' },
  { type: 'project', label: 'Project', icon: Briefcase, desc: 'Multi-section project' },
  { type: 'research', label: 'Research', icon: BookOpen, desc: 'Aggregated sources & notes' },
]

export default function NewCanvasPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const from = sp.get('from') || sp.get('conversationId')
  const [title, setTitle] = React.useState('')
  const [type, setType] = React.useState<CanvasType>('document')

  const create = useMutation({
    mutationFn: async () => (await api.post<{ id: string }>('/canvas', {
      title: title || 'Untitled canvas',
      type,
      conversationId: from || undefined,
    })).data,
    onSuccess: (c) => router.push(`/canvas/${c.id}`),
    onError: (e) => toast.error('Could not create canvas'),
  })

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-xl font-semibold">New canvas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick a type and give it a title.</p>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My new canvas" />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setType(t.type)}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs transition-colors ${
                    type === t.type ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
