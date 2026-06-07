'use client'
import * as React from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Pencil, Trash2, RotateCw, ThumbsUp, ThumbsDown, Heart, Laugh, Frown, Info, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/renderers/markdown'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { MessageRecord } from '@/lib/types'
import { formatDate, formatNumber } from '@/lib/utils'
import { toast } from 'sonner'

interface MessageBubbleProps {
  message: MessageRecord
  conversationId: string
  isLast: boolean
  isStreaming?: boolean
  onRegenerate?: () => void
  onEdit?: (id: string, content: string) => void
}

const REACTIONS = [
  { id: 'like', icon: ThumbsUp },
  { id: 'dislike', icon: ThumbsDown },
  { id: 'love', icon: Heart },
  { id: 'laugh', icon: Laugh },
  { id: 'sad', icon: Frown },
] as const

export function MessageBubble({ message, conversationId, isLast, isStreaming, onRegenerate, onEdit }: MessageBubbleProps) {
  const qc = useQueryClient()
  const [copied, setCopied] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(message.content)

  const react = useMutation({
    mutationFn: async (r: string | null) =>
      (await api.post(`/chat/conversations/${conversationId}/messages/${message.id}/react`, { reaction: r ?? '' })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation', conversationId] }),
  })
  const remove = useMutation({
    mutationFn: async () => { await api.delete(`/chat/conversations/${conversationId}/messages/${message.id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation', conversationId] }),
  })
  const saveEdit = useMutation({
    mutationFn: async (content: string) =>
      (await api.patch(`/chat/conversations/${conversationId}/messages/${message.id}`, { content })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] })
      setEditing(false)
    },
  })

  const isUser = message.role === 'user'

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('group flex w-full gap-3 px-4 py-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-brand text-white shadow-sm shadow-brand-500/20 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WormGPT" className="h-full w-full object-contain" />
        </div>
      )}
      <div className={cn('flex max-w-[85%] flex-col gap-1.5', isUser && 'items-end')}>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{isUser ? 'You' : 'WormGPT'}</span>
          {message.model && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{message.model}</span>}
          <span>· {formatDate(message.createdAt)}</span>
        </div>

        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm shadow-sm',
            isUser ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
          )}
        >
          {Array.isArray((message.metadata as any)?.attachments) && ((message.metadata as any).attachments as any[]).length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {((message.metadata as any).attachments as any[]).map((a: any) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border border-border bg-background/50"
                >
                  {a.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.name || 'attachment'} className="h-24 w-auto max-w-[200px] object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="max-w-[180px] truncate">{a.name || 'file'}</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full min-h-[100px] resize-y rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditValue(message.content) }}>Cancel</Button>
                <Button size="sm" onClick={() => saveEdit.mutate(editValue)} disabled={!editValue.trim()}>Save</Button>
              </div>
            </div>
          ) : (
            <>
              {isStreaming && !message.content ? (
                <div className="flex items-center gap-1 py-1 text-muted-foreground">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              ) : (
                <Markdown>{message.content}</Markdown>
              )}
            </>
          )}
        </div>

        {!editing && (
          <div className={cn('flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100', isUser && 'justify-end')}>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {isUser ? (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => { if (confirm('Delete message?')) remove.mutate() }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                {onRegenerate && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRegenerate}>
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <DropdownReactions current={message.reaction || null} onPick={(r) => react.mutate(r === message.reaction ? null : r)} />
                {message.metadata?.latency_ms && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3" /> {message.metadata.latency_ms}ms
                    {message.tokens ? ` · ${formatNumber(message.tokens)} tok` : ''}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {message.reaction && (
          <div className="self-start text-xs text-muted-foreground">
            Reacted: <span className="font-medium">{message.reaction}</span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-medium text-white">
          U
        </div>
      )}
    </motion.div>
  )
}

function DropdownReactions({ current, onPick }: { current: string | null; onPick: (r: string) => void }) {
  return (
    <div className="flex items-center rounded-md border border-transparent bg-muted/0 px-0.5 hover:bg-muted/60">
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          onClick={() => onPick(r.id)}
          className={cn(
            'rounded p-1 text-muted-foreground hover:text-foreground',
            current === r.id && 'text-primary'
          )}
          aria-label={r.id}
        >
          <r.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
