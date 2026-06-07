'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Code2, FileCode2, Briefcase, BookOpen, Trash2, MoreHorizontal, History, RotateCcw, Download, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CanvasRecord, CanvasVersion } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const ICONS: Record<string, any> = { document: FileText, code: Code2, markdown: FileCode2, project: Briefcase, research: BookOpen }

export default function CanvasListPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const sp = useSearchParams()
  const initialConv = sp.get('conversationId')

  const listQ = useQuery({
    queryKey: ['canvases'],
    queryFn: async () => (await api.get<CanvasRecord[]>('/canvas')).data,
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Canvases</h1>
          <p className="text-xs text-muted-foreground">AI-assisted writing, code, and research workspaces with full version history.</p>
        </div>
        <Button onClick={() => router.push('/canvas/new?from=' + (initialConv || ''))}>
          <Plus className="h-4 w-4" /> New canvas
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {(listQ.data || []).map((c) => {
            const Icon = ICONS[c.type] || FileText
            return (
              <Card key={c.id} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push(`/canvas/${c.id}`)}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">v{c.currentVersion}</span>
                  </div>
                  <h3 className="line-clamp-1 text-sm font-medium">{c.title}</h3>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{c.content || 'Empty canvas'}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Updated {formatRelative(c.updatedAt)}</span>
                    <span>v{c.currentVersion}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {(listQ.data || []).length === 0 && (
            <div className="col-span-full p-12 text-center text-sm text-muted-foreground">
              No canvases yet. Create your first one.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
