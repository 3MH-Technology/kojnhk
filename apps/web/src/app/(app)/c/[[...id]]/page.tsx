'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api, getAccessToken } from '@/lib/api'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { Composer, ComposerAttachment } from '@/components/chat/composer'
import { MessageBubble } from '@/components/chat/message'
import { ConversationRecord, ConversationWithMessages, MessageRecord } from '@/lib/types'
import { ArrowDown, FileText, Share2, Sparkles, MessageSquare, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ConversationPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const id = params?.id
  const qc = useQueryClient()
  const selectedModelId = useUIStore((s) => s.selectedModelId)
  const setModel = useUIStore((s) => s.setModel)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const [streaming, setStreaming] = React.useState(false)
  const [streamText, setStreamText] = React.useState('')
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [composerValue, setComposerValue] = React.useState('')

  const convQ = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => (await api.get<ConversationWithMessages>(`/chat/conversations/${id}`)).data,
    enabled: !!id,
  })

  const modelsQ = useQuery({
    queryKey: ['models'],
    queryFn: async () => (await api.get('/models')).data,
  })

  React.useEffect(() => {
    if (convQ.data && !selectedModelId && convQ.data.modelId) setModel(convQ.data.modelId)
  }, [convQ.data, selectedModelId, setModel])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setAutoScroll(dist < 80)
  }

  React.useEffect(() => {
    if (autoScroll) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: streaming ? 'auto' : 'smooth' })
  }, [convQ.data?.messages, streamText, autoScroll, streaming])

  function readCsrfToken(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  async function sendMessage(content: string, opts: { webSearch?: boolean; canvas?: boolean; attachments?: ComposerAttachment[] } = {}) {
    if (!id) return
    setAutoScroll(true)
    // Optimistic append
    const tempUserId = `tmp-${Date.now()}`
    const userMsg: MessageRecord = {
      id: tempUserId, conversationId: id, role: 'user', content,
      metadata: opts.attachments ? { attachments: opts.attachments } : {},
      createdAt: new Date().toISOString(), tokens: null, model: null, reaction: null, parentId: null,
    }
    qc.setQueryData<ConversationWithMessages>(['conversation', id], (prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev
    )
    setStreamText('')
    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const token = getAccessToken()
      const csrf = readCsrfToken()
      const res = await fetch(`/api/v1/chat/conversations/${id}/stream`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify({
          content,
          modelId: selectedModelId || convQ.data?.modelId || null,
          role: 'user',
          attachments: opts.attachments?.map((a) => ({ id: a.id, kind: a.kind, name: a.name, url: a.url, mimeType: a.mimeType })),
          webSearch: !!opts.webSearch,
          canvas: !!opts.canvas,
        }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const evt of events) {
          const lines = evt.split('\n')
          let event = ''
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event:')) {
              event = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              data = line.slice(5).trim()
            }
          }
          if (!event && !data) continue
          try {
            const payload = data ? JSON.parse(data) : {}
            if (event === 'delta' && payload.text) {
              setStreamText((t) => t + payload.text)
            } else if (event === 'start') {
              // user message persisted server-side
            } else if (event === 'finish') {
              // stream finished, final chunk delivered
            } else if (event === 'done' && payload.assistantMessageId) {
              if (payload.canvasId) {
                toast('Response saved to Canvas', {
                  action: { label: 'Open', onClick: () => window.open(`/canvas/${payload.canvasId}`, '_blank') },
                  duration: 6000,
                })
              }
            } else if (event === 'error') {
              toast.error(payload.message || 'stream error')
            }
          } catch { /* malformed JSON, skip */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error(e?.message || 'stream failed')
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
      setStreamText('')
      qc.invalidateQueries({ queryKey: ['conversation', id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }
  }

  // Handle auto-starting chat via search query params
  React.useEffect(() => {
    if (id && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const init = searchParams.get('init')
      if (init) {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
        sendMessage(init)
      }
    }
  }, [id])

  async function startNewChat(content: string, opts: any = {}) {
    try {
      const c = (await api.post<ConversationRecord>('/chat/conversations', {})).data
      qc.invalidateQueries({ queryKey: ['conversations'] })
      router.push(`/c/${c.id}?init=${encodeURIComponent(content)}`)
    } catch (e) {
      toast.error('Failed to start chat')
    }
  }

  async function regenerate() {
    const msgs = convQ.data?.messages || []
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (lastUser) sendMessage(lastUser.content)
  }

  function exportConversation() {
    const c = convQ.data
    if (!c) return
    const md = `# ${c.title}\n\n` + c.messages.map((m) => `## ${m.role}\n\n${m.content}\n`).join('\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${c.title.replace(/\W+/g, '-').toLowerCase()}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  const messages = convQ.data?.messages || []
  const visibleMessages: MessageRecord[] = streaming
    ? [...messages, { id: 'pending', conversationId: id || '', role: 'assistant', content: streamText, metadata: {}, createdAt: new Date().toISOString(), tokens: null, model: null, reaction: null, parentId: null } as MessageRecord]
    : messages

  if (!id) {
    return (
      <>
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <div className="flex flex-1 items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center px-4 max-w-xl"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/20 border border-brand-500/10 shadow-lg shadow-brand-500/5 glow-red p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="WormGPT" className="h-full w-full object-contain" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Start a new chat</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">Pick a model in the top bar and ask any question without constraints.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Write code', text: 'Write a Python script to scan a local directory for duplicate files.' },
                  { label: 'Explain concepts', text: 'Explain the difference between JWT and Session cookies in simple terms.' },
                  { label: 'Debug issues', text: 'Help me debug a TypeScript error where property exact does not exist.' },
                  { label: 'Research topics', text: 'Research the latest open source LLM benchmarks and list top performers.' }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setComposerValue(s.text)}
                    className="rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:border-primary/20 hover:text-foreground transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary/70" />
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
          <div className="border-t bg-background/60 px-4 py-4 backdrop-blur">
            <Composer
              onSend={startNewChat}
              value={composerValue}
              onChange={setComposerValue}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <div className="flex items-center justify-between border-b border-border bg-background/40 px-6 py-2.5 text-sm">
          <div className="flex items-center gap-2 truncate">
            <span className="truncate font-semibold">{convQ.data?.title || '…'}</span>
            {convQ.data?.favorite && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">favorite</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" onClick={exportConversation}><FileText className="h-3.5 w-3.5 mr-1" /> Export</Button>
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" asChild><Link href={`/canvas?conversationId=${id}`}><FileText className="h-3.5 w-3.5 mr-1" /> Canvas</Link></Button>
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground"><Share2 className="h-3.5 w-3.5 mr-1" /> Share</Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-thin h-full overflow-y-auto bg-background/20">
            <div className="mx-auto max-w-3xl pb-32">
              {convQ.isLoading && (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading chat messages…</div>
              )}
              {visibleMessages.length === 0 && !convQ.isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="px-4 py-20 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt="WormGPT" className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-lg shadow-black/5" />
                  <h2 className="mt-6 text-2xl font-extrabold tracking-tight">How can I help today?</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Send a message or select a shortcut below to start the conversation.</p>
                  <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
                    {[
                      { icon: MessageSquare, label: 'Ask a question', text: 'What is the best way to secure a FastAPI endpoint?' },
                      { icon: Zap, label: 'Generate code', text: 'Write an async Python client for fetching model data from a JSON API.' },
                      { icon: Sparkles, label: 'Brainstorm ideas', text: 'Give me 5 creative ideas for a cybersecurity CTF challenge.' },
                      { icon: FileText, label: 'Summarize text', text: 'Summarize the key security implications of utilizing unverified packages.' },
                    ].map(({ icon: Icon, label, text }) => (
                      <button
                        key={label}
                        onClick={() => setComposerValue(text)}
                        className="flex flex-col items-start gap-1 text-left rounded-xl border border-border bg-card/60 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-card hover:shadow-md cursor-pointer group"
                      >
                        <Icon className="h-5 w-5 text-primary/70 group-hover:scale-110 transition-transform duration-200" />
                        <span className="block text-sm font-semibold mt-1">{label}</span>
                        <span className="block text-[11px] text-muted-foreground leading-normal mt-0.5 line-clamp-2">{text}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {visibleMessages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  conversationId={id}
                  isLast={i === visibleMessages.length - 1}
                  isStreaming={streaming && m.id === 'pending'}
                  onRegenerate={m.role === 'assistant' && i === visibleMessages.length - 1 ? regenerate : undefined}
                />
              ))}
            </div>
          </div>
          {!autoScroll && (
            <button
              onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }}
              className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-md hover:bg-accent transition-all duration-200"
            >
              <ArrowDown className="h-3.5 w-3.5" /> Jump to latest
            </button>
          )}
        </div>

        <div className="border-t bg-background/60 backdrop-blur">
          <Composer
            onSend={sendMessage}
            value={composerValue}
            onChange={setComposerValue}
            streaming={streaming}
            onStop={() => { abortRef.current?.abort() }}
            modelMaxTokens={(modelsQ.data || []).find((m: any) => m.id === (selectedModelId || convQ.data?.modelId))?.maxTokens || 8192}
          />
        </div>
      </div>
    </>
  )
}
