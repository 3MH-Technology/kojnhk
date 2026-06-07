'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RefreshCw, FlaskConical, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Provider, ProviderKeyRecord } from '@/lib/types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ProviderLogo } from '@/components/layout/topbar'

const ALL_PROVIDERS: Provider[] = ['groq', 'openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'ollama']

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }
}

export function ProviderManager() {
  const qc = useQueryClient()
  const listQ = useQuery({
    queryKey: ['providers'],
    queryFn: async () => (await api.get<ProviderKeyRecord[]>('/providers')).data,
  })
  const [adding, setAdding] = React.useState(false)
  const [presetProvider, setPresetProvider] = React.useState<string | null>(null)

  const remove = useMutation({
    mutationFn: async (provider: string) => { await api.delete(`/providers/${provider}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); qc.invalidateQueries({ queryKey: ['developer', 'models'] }); toast.success('Provider removed') },
  })

  const sync = useMutation({
    mutationFn: async (provider: string) => (await api.post(`/providers/${provider}/sync`)).data,
    onSuccess: (d: ProviderKeyRecord) => {
      qc.invalidateQueries({ queryKey: ['providers'] }); qc.invalidateQueries({ queryKey: ['developer', 'models'] })
      toast.success(`Synced ${d.modelsImported} models from ${d.provider}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Sync failed'),
  })

  const testKey = useMutation({
    mutationFn: async (provider: string) => (await api.post(`/providers/${provider}/test`)).data,
    onSuccess: (d: any) => toast.success(`Key valid: ${d.modelsFound} models found`),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Test failed'),
  })

  const configured = new Set((listQ.data || []).map((p) => p.provider))
  const unconfigured = ALL_PROVIDERS.filter((p) => !configured.has(p))

  const handleAddClick = (p: string) => {
    setPresetProvider(p)
    setAdding(true)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Keys</h1>
          <p className="text-sm text-muted-foreground">Manage API keys per provider. Adding a key automatically imports available models (disabled by default).</p>
        </div>
      </div>

      {/* Configured providers */}
      {(listQ.data || []).length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {(listQ.data || []).map((p) => (
            <motion.div key={p.id} variants={itemVariants}>
              <Card className="overflow-hidden transition-all duration-300 card-hover hover:border-primary/20 hover:shadow-lg dark:hover:shadow-black/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted border border-border shadow-inner">
                        <ProviderLogo provider={p.provider} className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-semibold capitalize">{p.provider}</CardTitle>
                    </div>
                    <Badge variant={p.status === 'active' ? 'success' : p.status === 'error' ? 'destructive' : 'secondary'} className="gap-1 px-2.5 py-0.5">
                      {p.status === 'active' && <CheckCircle2 className="h-3 w-3" />}
                      {p.status === 'error' && <AlertCircle className="h-3 w-3" />}
                      <span className="capitalize">{p.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{p.modelsImported} models imported</span>
                    {p.lastSyncAt && (
                      <>
                        <span>·</span>
                        <span>Synced {new Date(p.lastSyncAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {p.endpoint && (
                    <div className="truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
                      Endpoint: {p.endpoint}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button size="sm" variant="outline" onClick={() => sync.mutate(p.provider)} disabled={sync.isPending} className="h-8 gap-1.5">
                      <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} /> Sync
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testKey.mutate(p.provider)} className="h-8 gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5" /> Test
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Remove ${p.provider} key? Imported models will remain.`)) remove.mutate(p.provider) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Unconfigured providers */}
      {unconfigured.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Available Providers</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
          >
            {unconfigured.map((p) => (
              <motion.button
                key={p}
                variants={itemVariants}
                onClick={() => handleAddClick(p)}
                className="group flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3.5 text-left transition-all duration-300 hover:border-solid hover:border-primary/30 hover:bg-muted/30 hover:shadow-md hover:shadow-black/5"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted border border-dashed border-border group-hover:border-solid transition-all duration-300">
                  <ProviderLogo provider={p} className="h-4.5 w-4.5 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold capitalize leading-none mb-1">{p}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">Configure API key</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}

      {adding && <AddProviderDialog configured={configured} defaultProvider={presetProvider} onClose={() => { setAdding(false); setPresetProvider(null) }} />}
    </div>
  )
}

function AddProviderDialog({ configured, defaultProvider, onClose }: { configured: Set<string>; defaultProvider: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const available = ALL_PROVIDERS.filter((p) => !configured.has(p))
  const [form, setForm] = React.useState({
    provider: (defaultProvider || available[0] || 'groq') as string,
    apiKey: '',
    endpoint: '',
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { provider: form.provider, apiKey: form.apiKey }
      if (form.endpoint) payload.endpoint = form.endpoint
      return (await api.post('/providers', payload)).data
    },
    onSuccess: (d: ProviderKeyRecord) => {
      qc.invalidateQueries({ queryKey: ['providers'] })
      qc.invalidateQueries({ queryKey: ['developer', 'models'] })
      toast.success(`Added ${d.provider} — ${d.modelsImported} models imported`)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to add provider'),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Provider Key</DialogTitle>
          <DialogDescription>Enter your API key. Models will be automatically imported (disabled by default so you can review before enabling).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_PROVIDERS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key</label>
            <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom endpoint (optional)</label>
            <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.example.com/v1" className="h-10" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.apiKey} className="gradient-brand text-white">Save &amp; Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
