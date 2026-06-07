'use client'
import * as React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { ArrowUp, Square, Paperclip, Globe, FileText, Sparkles, X, File as FileIcon, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api, apiError } from '@/lib/api'
import { AttachmentRecord } from '@/lib/types'
import { toast } from 'sonner'

export interface ComposerAttachment {
  id: string
  kind: 'image' | 'file'
  name: string
  url: string
  mimeType: string
  size: number
}

export interface ComposerProps {
  onSend: (msg: string, opts: {
    webSearch?: boolean
    canvas?: boolean
    attachments?: ComposerAttachment[]
  }) => void
  onStop?: () => void
  streaming?: boolean
  placeholder?: string
  modelMaxTokens?: number
  value?: string
  onChange?: (v: string) => void
}

const MAX_CHARS_PER_TOKEN_ESTIMATE = 4

export function Composer({ onSend, onStop, streaming, placeholder, modelMaxTokens = 8192, value: externalValue, onChange }: ComposerProps) {
  const [value, setValue] = React.useState('')
  const [webSearch, setWebSearch] = React.useState(false)
  const [canvas, setCanvas] = React.useState(false)
  const [attachments, setAttachments] = React.useState<ComposerAttachment[]>([])
  const [uploading, setUploading] = React.useState(false)
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => { ref.current?.focus() }, [])

  React.useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue)
      if (externalValue) {
        ref.current?.focus()
      }
    }
  }, [externalValue])

  const handleValueChange = (val: string) => {
    setValue(val)
    if (onChange) onChange(val)
  }

  const estimatedTokens = Math.ceil(value.length / MAX_CHARS_PER_TOKEN_ESTIMATE)
  const contextUsed = Math.min(100, Math.round((estimatedTokens / Math.max(modelMaxTokens, 1)) * 100))
  const overLimit = estimatedTokens > modelMaxTokens * 0.9

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploaded: ComposerAttachment[] = []
      for (const f of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', f)
        const r = await api.post<AttachmentRecord>('/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        uploaded.push({
          id: r.data.id, kind: r.data.kind, name: r.data.originalName,
          url: r.data.url, mimeType: r.data.mimeType, size: r.data.size,
        })
      }
      setAttachments((a) => [...a, ...uploaded])
    } catch (e) {
      toast.error(apiError(e))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function send() {
    const v = value.trim()
    if (!v) return
    onSend(v, { webSearch, canvas, attachments: attachments.length ? attachments : undefined })
    handleValueChange('')
    setAttachments([])
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <div className={cn(
        'rounded-2xl border bg-card shadow-lg transition-all focus-within:shadow-xl',
        overLimit ? 'border-amber-500/60' : 'border-border'
      )}>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a) => (
              <div key={a.id} className="group relative flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                {a.kind === 'image' ? <ImageIcon className="h-3.5 w-3.5 text-primary" /> : <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="max-w-[160px] truncate">{a.name}</span>
                <button
                  onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))}
                  className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <TextareaAutosize
          ref={ref}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={placeholder || 'Message WormGPT… (Shift+Enter for newline)'}
          minRows={1}
          maxRows={12}
          className="w-full resize-none bg-transparent px-4 pt-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center gap-1 px-2 pb-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => fileInput.current?.click()}
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            disabled={uploading}
          >
            <Paperclip className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Attach'}
          </Button>
          <Button
            type="button" variant={webSearch ? 'default' : 'ghost'} size="sm"
            onClick={() => setWebSearch((v) => !v)}
            className={cn('h-7 gap-1.5 text-xs', !webSearch && 'text-muted-foreground')}
          >
            <Globe className="h-3.5 w-3.5" /> Web
          </Button>
          <Button
            type="button" variant={canvas ? 'default' : 'ghost'} size="sm"
            onClick={() => setCanvas((v) => !v)}
            className={cn('h-7 gap-1.5 text-xs', !canvas && 'text-muted-foreground')}
          >
            <FileText className="h-3.5 w-3.5" /> Canvas
          </Button>

          {/* Token-aware status */}
          <div className="mx-2 hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
            <div
              className={cn('h-full transition-all', overLimit ? 'bg-amber-500' : contextUsed > 70 ? 'bg-amber-400' : 'bg-emerald-500')}
              style={{ width: `${contextUsed}%` }}
            />
          </div>
          <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:inline">
            ~{estimatedTokens.toLocaleString()} / {modelMaxTokens.toLocaleString()} tok
          </span>

          <span className="ml-auto" />
          <span className="mr-2 text-[11px] text-muted-foreground">{value.length} chars</span>
          {streaming ? (
            <Button size="icon" variant="destructive" onClick={onStop} className="h-8 w-8">
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="icon" variant="gradient" onClick={send} disabled={!value.trim()} className="h-8 w-8">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        WormGPT can produce unfiltered output. Use responsibly.
      </p>
    </div>
  )
}
