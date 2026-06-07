'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronDown, LogOut, User as UserIcon, Settings, Sun, Moon, Laptop, Skull, Shield, Cpu } from 'lucide-react'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { ModelRecord, NotificationRecord, Provider } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function ProviderLogo({ provider, className = "h-4 w-4" }: { provider: string; className?: string }) {
  switch (provider.toLowerCase()) {
    case 'openai':
      return (
        <svg className={cn("text-emerald-600 dark:text-emerald-400", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M12 6v12M6 12h12M7.75 7.75l8.5 8.5M7.75 16.25l8.5-8.5" />
        </svg>
      )
    case 'anthropic':
      return (
        <svg className={cn("text-amber-600 dark:text-amber-500", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16M7 20 12 4l5 16M9 14h6" />
        </svg>
      )
    case 'gemini':
      return (
        <svg className={cn("text-blue-500 dark:text-blue-400", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 0 0 9 9 9 9 0 0 0-9 9 9 9 0 0 0-9-9 9 9 0 0 0 9-9Z" fill="currentColor" className="opacity-20" />
          <path d="M12 3a9 9 0 0 0 9 9 9 9 0 0 0-9 9 9 9 0 0 0-9-9 9 9 0 0 0 9-9Z" />
        </svg>
      )
    case 'groq':
      return (
        <svg className={cn("text-orange-500", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" fill="currentColor" className="opacity-20" />
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        </svg>
      )
    case 'deepseek':
      return (
        <svg className={cn("text-blue-600 dark:text-blue-400", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5Z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )
    case 'qwen':
      return (
        <svg className={cn("text-purple-600 dark:text-purple-400", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M12 22V12M12 12L4 7.5M12 12l8-4.5" />
        </svg>
      )
    case 'ollama':
      return (
        <svg className={cn("text-gray-600 dark:text-gray-300", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0v-3Z" />
        </svg>
      )
    default:
      return (
        <svg className={cn("text-muted-foreground", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      )
  }
}

export function TopBar() {
  const router = useRouter()
  const { theme, setTheme, selectedModelId, setModel } = useUIStore()
  const { user, logout } = useAuthStore()

  const modelsQ = useQuery({
    queryKey: ['models'],
    queryFn: async () => (await api.get<ModelRecord[]>('/models')).data,
  })

  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<NotificationRecord[]>('/notifications')).data,
    refetchInterval: 30_000,
  })

  const unread = (notifQ.data || []).filter((n) => !n.read).length
  const selectedModel = (modelsQ.data || []).find((m) => m.id === selectedModelId) || (modelsQ.data || [])[0]

  // Group models by provider
  const groupedModels = React.useMemo(() => {
    const models = modelsQ.data || []
    const groups = new Map<string, ModelRecord[]>()
    for (const m of models) {
      const list = groups.get(m.provider) || []
      list.push(m)
      groups.set(m.provider, list)
    }
    return groups
  }, [modelsQ.data])

  return (
    <header className="relative z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 hover:bg-muted/80 transition-all">
              {selectedModel ? (
                <ProviderLogo provider={selectedModel.provider} className="h-4 w-4" />
              ) : (
                <img src="/logo.svg" alt="" className="h-5 w-5 rounded object-contain" />
              )}
              <span className="text-sm font-medium">{(selectedModel?.displayName || selectedModel?.name) ?? 'Select model'}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Model</DropdownMenuLabel>
            {(modelsQ.data || []).length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">No models configured yet.</div>
            ) : (
              <DropdownMenuRadioGroup
                value={selectedModelId || selectedModel?.id || ''}
                onValueChange={(v) => setModel(v)}
              >
                {Array.from(groupedModels.entries()).map(([provider, models], gi) => (
                  <React.Fragment key={provider}>
                    {gi > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="flex items-center gap-1.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <ProviderLogo provider={provider} className="h-3.5 w-3.5" />
                      <span className="ml-1 capitalize">{provider}</span>
                    </DropdownMenuLabel>
                    {models.map((m) => (
                      <DropdownMenuRadioItem key={m.id} value={m.id} className="py-2">
                        <div className="flex w-full flex-col">
                          <span className="text-sm font-medium">{m.displayName || m.name}</span>
                          {m.displayName && <span className="text-[10px] font-mono text-muted-foreground">{m.name}</span>}
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </React.Fragment>
                ))}
              </DropdownMenuRadioGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-sm">Personal</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuItem>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Personal
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Team (coming soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              <Link href="/notifications" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {(notifQ.data || []).slice(0, 8).map((n) => (
                <div key={n.id} className="flex items-start gap-2 px-2 py-2 text-sm hover:bg-accent">
                  <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', {
                    'bg-blue-500': n.kind === 'info',
                    'bg-emerald-500': n.kind === 'success',
                    'bg-amber-500': n.kind === 'warning',
                    'bg-red-500': n.kind === 'error',
                  }, !n.read && 'ring-2 ring-offset-1 ring-offset-popover')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{n.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                  </div>
                </div>
              ))}
              {(notifQ.data || []).length === 0 && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">All caught up</div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as any)}>
              <DropdownMenuRadioItem value="light"><Sun className="h-3.5 w-3.5" /> Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark"><Moon className="h-3.5 w-3.5" /> Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system"><Laptop className="h-3.5 w-3.5" /> System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-1.5">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-medium text-white">
                {(user?.username || '?').slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden text-sm md:inline">{user?.username}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/profile')}><UserIcon className="h-3.5 w-3.5" /> Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/security')}><Shield className="h-3.5 w-3.5" /> Security</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}><Settings className="h-3.5 w-3.5" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await logout(); router.push('/login') }}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
