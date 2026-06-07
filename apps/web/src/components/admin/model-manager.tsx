'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Power, KeyRound, FlaskConical, X, Search, FileText, Bot, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { ModelRecord, SystemPromptSummary, ProviderKeyRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ProviderLogo } from '@/components/layout/topbar'

const PROVIDERS = ['groq', 'openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'ollama', 'custom']

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } }
}

export function ModelManager() {
  const qc = useQueryClient()
  const listQ = useQuery({
    queryKey: ['developer', 'models'],
    queryFn: async () => (await api.get<ModelRecord[]>('/developer/models')).data,
  })
  const [editing, setEditing] = React.useState<ModelRecord | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [filter, setFilter] = React.useState('')

  const promptsQ = useQuery({
    queryKey: ['system-prompts', 'summary'],
    queryFn: async () => (await api.get<SystemPromptSummary[]>('/system-prompts/summary')).data,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/models/${id}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['developer', 'models'] }); toast.success('Deleted') },
  })
  const toggleEnabled = useMutation({
    mutationFn: async (m: ModelRecord) => (await api.patch(`/models/${m.id}`, { enabled: !m.enabled })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['developer', 'models'] }),
  })
  const test = useMutation({
    mutationFn: async (id: string) => (await api.post(`/models/${id}/test`)).data,
    onSuccess: (d: any) => toast.success(`OK: ${d.sample}`),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Test failed'),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">Add, edit, enable, disable, and test AI models. API keys are encrypted at rest and never sent to the browser.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gradient-brand text-white shadow-md shadow-brand-500/10"><Plus className="mr-1.5 h-4 w-4" /> New model</Button>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter models by name, provider or display name…"
          className="pl-9 h-10 border-border/80 bg-background/50 focus:bg-background"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {(listQ.data || []).filter((m) => {
          if (!filter) return true
          const f = filter.toLowerCase()
          return m.name.toLowerCase().includes(f) || m.provider.toLowerCase().includes(f) || (m.displayName || '').toLowerCase().includes(f)
        }).map((m) => (
          <motion.div key={m.id} variants={itemVariants}>
            <Card className="overflow-hidden transition-all duration-300 card-hover hover:border-primary/20 hover:shadow-lg dark:hover:shadow-black/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted border border-border shadow-inner">
                      <ProviderLogo provider={m.provider} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold truncate leading-snug">{m.displayName || m.name}</CardTitle>
                      {m.displayName && <p className="truncate font-mono text-[10px] text-muted-foreground">{m.name}</p>}
                    </div>
                  </div>
                  <Badge variant={m.enabled ? 'success' : 'secondary'} className="shrink-0 gap-1 px-2.5 py-0.5">
                    <span className={cn('inline-block h-1.5 w-1.5 rounded-full', m.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50')} />
                    <span>{m.enabled ? 'enabled' : 'disabled'}</span>
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono capitalize">{m.provider}</span>
                  <span>temp {m.temperature}</span>
                  <span>·</span>
                  <span>max {m.maxTokens} tok</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {m.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.description}</p>}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {m.hasApiKey ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><KeyRound className="h-3 w-3" /> key configured</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium"><KeyRound className="h-3 w-3" /> no key</span>
                  )}
                  {m.systemPromptName && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-violet-600 dark:text-violet-400 font-medium">
                      <FileText className="h-3 w-3" /> {m.systemPromptName}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)} className="h-8 gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleEnabled.mutate(m)} className="h-8 gap-1.5">
                    <Power className="h-3.5 w-3.5" /> {m.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => test.mutate(m.id)} className="h-8 gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5" /> Test
                  </Button>
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('Delete this model?')) remove.mutate(m.id) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {(creating || editing) && (
        <ModelForm
          initial={editing}
          prompts={promptsQ.data || []}
          onClose={() => { setEditing(null); setCreating(false) }}
        />
      )}

      {(listQ.data || []).length === 0 && !listQ.isLoading && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center bg-card/20 backdrop-blur-sm">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground/45" />
          <h3 className="mt-4 text-base font-semibold">No models yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">Add a provider key to auto-import models, or create one manually.</p>
          <Button className="mt-5 gradient-brand text-white" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New model</Button>
        </div>
      )}
    </div>
  )
}

function ModelForm({ initial, prompts, onClose }: { initial: ModelRecord | null; prompts: SystemPromptSummary[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<string[]>([])
  const [loadingModels, setLoadingModels] = React.useState(false)
  const [customName, setCustomName] = React.useState(false)

  const providersQ = useQuery({
    queryKey: ['providers'],
    queryFn: async () => (await api.get<ProviderKeyRecord[]>('/providers')).data,
  })

  const providersWithKeys = (providersQ.data || []).filter((p) => p.hasApiKey)

  const [form, setForm] = React.useState({
    name: initial?.name || '',
    displayName: initial?.displayName || '',
    provider: (initial?.provider || providersWithKeys[0]?.provider || 'groq') as string,
    endpoint: initial?.endpoint || '',
    apiKey: '',
    temperature: initial?.temperature ?? 0.7,
    maxTokens: initial?.maxTokens ?? 4096,
    topP: initial?.topP ?? 1.0,
    description: initial?.description || '',
    systemPromptId: initial?.systemPromptId || '',
    enabled: initial?.enabled ?? true,
  })

  React.useEffect(() => {
    if (!initial && providersWithKeys.length > 0 && !form.provider) {
      setForm((prev) => ({ ...prev, provider: providersWithKeys[0].provider }))
    }
  }, [providersWithKeys, initial])

  React.useEffect(() => {
    if (!form.provider) return
    setLoadingModels(true)
    setAvailableModels([])
    setCustomName(false)
    api.post<{ ok: boolean; models?: string[]; error?: string }>(`/providers/${form.provider}/test`)
      .then((res) => {
        const models = res.data.models
        if (res.data.ok && models && models.length > 0) {
          setAvailableModels(models)
          if (!initial && !form.name) {
            setForm((prev) => ({ ...prev, name: models[0] }))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false))
  }, [form.provider])

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form }
      if (!payload.apiKey) delete payload.apiKey
      if (!payload.displayName) delete payload.displayName
      if (!payload.systemPromptId) delete payload.systemPromptId
      if (initial) return (await api.patch(`/models/${initial.id}`, payload)).data
      return (await api.post('/models', payload)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['developer', 'models'] })
      qc.invalidateQueries({ queryKey: ['models'] })
      toast.success('Saved')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit model' : 'New model'}</DialogTitle>
          <DialogDescription>API keys are encrypted at rest. Only superadmins can reveal the plaintext later.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(providersWithKeys.length > 0 ? providersWithKeys : PROVIDERS.map((p) => ({ provider: p, hasApiKey: false } as ProviderKeyRecord))).map((p) => (
                  <SelectItem key={p.provider} value={p.provider} className="capitalize">
                    <span className="flex items-center gap-2">
                      {p.hasApiKey && <KeyRound className="h-3 w-3 text-emerald-500" />}
                      {p.provider}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display name</label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Llama 3.3 70B" className="h-10" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model name</label>
            {loadingModels ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading models…
              </div>
            ) : !customName && availableModels.length > 0 ? (
              <div className="flex gap-2">
                <Select
                  value={form.name}
                  onValueChange={(v) => {
                    if (v === '__custom__') { setCustomName(true); setForm({ ...form, name: '' }) }
                    else setForm({ ...form, name: v })
                  }}
                >
                  <SelectTrigger className="h-10 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}
                    <SelectItem value="__custom__" className="text-muted-foreground italic">Other…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="llama-3.3-70b-versatile" className="h-10" />
            )}
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System prompt</label>
            <Select value={form.systemPromptId || 'none'} onValueChange={(v) => setForm({ ...form, systemPromptId: v === 'none' ? '' : v })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {prompts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-10" />
          </div>

          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Advanced features
            </button>
          </div>

          {showAdvanced && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temperature</label>
                <Input type="number" step="0.1" min={0} max={2} value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max tokens</label>
                <Input type="number" min={1} max={200000} value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top P</label>
                <Input type="number" step="0.05" min={0} max={1} value={form.topP} onChange={(e) => setForm({ ...form, topP: Number(e.target.value) })} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endpoint (optional)</label>
                <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} className="h-10" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API key (leave blank to keep current)</label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="h-10" />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name} className="gradient-brand text-white">{initial ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
