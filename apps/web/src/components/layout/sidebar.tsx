'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MessageSquare, Search, Star, Users, Folder, Settings, LogOut, Skull, ChevronLeft,
  ChevronRight, Trash2, Pencil, MoreHorizontal, Sparkles, FileText, PanelLeftClose, PanelLeft,
  Shield, User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn, formatRelative, isDeveloper, isAdmin } from '@/lib/utils'
import { api, apiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useDebounce } from 'use-debounce'
import { ConversationRecord, FolderRecord } from '@/lib/types'
import { toast } from 'sonner'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useUIStore((s) => s.toggleCollapsed)
  const [q, setQ] = React.useState('')
  const [dq] = useDebounce(q, 250)
  const [scope, setScope] = React.useState<'all' | 'favorites' | 'shared'>('all')
  const [folderId, setFolderId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')

  const convosQ = useQuery({
    queryKey: ['conversations', dq, scope, folderId],
    queryFn: async () => {
      const r = await api.get<ConversationRecord[]>('/chat/conversations', {
        params: { q: dq || undefined, favorite: scope === 'favorites' ? true : undefined, shared: scope === 'shared' ? true : undefined, folderId: folderId || undefined },
      })
      return r.data
    },
  })
  const foldersQ = useQuery({
    queryKey: ['folders'],
    queryFn: async () => (await api.get<FolderRecord[]>('/chat/folders')).data,
  })

  const create = useMutation({
    mutationFn: async () => (await api.post<ConversationRecord>('/chat/conversations', {})).data,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      router.push(`/c/${c.id}`)
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/chat/conversations/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      (await api.patch<ConversationRecord>(`/chat/conversations/${id}`, { title })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const toggleFav = useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) =>
      (await api.patch<ConversationRecord>(`/chat/conversations/${id}`, { favorite })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const createFolder = useMutation({
    mutationFn: async () => (await api.post<FolderRecord>('/chat/folders', { name: 'New folder' })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 288 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="relative z-20 hidden h-full shrink-0 border-r border-sidebar bg-sidebar text-sidebar-foreground md:flex md:flex-col"
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <Link href="/c" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WormGPT" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          {!collapsed && <span className="font-semibold">WormGPT</span>}
        </Link>
        <button
          onClick={toggleCollapsed}
          className="ml-auto rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-white/5"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn('px-3', collapsed && 'px-2')}>
        <Button
          onClick={() => create.mutate()}
          className={cn('w-full justify-center', !collapsed && 'justify-start')}
          variant="gradient"
          size={collapsed ? 'icon' : 'default'}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New chat</span>}
        </Button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats…"
              className="h-8 border-white/10 bg-white/5 pl-7 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-white/20"
            />
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mt-2 flex items-center gap-1 px-3 text-xs">
          {(['all', 'favorites', 'shared'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                'rounded-md px-2 py-1 transition-colors',
                scope === s ? 'bg-white/10 text-white' : 'text-sidebar-foreground/60 hover:bg-white/5'
              )}
            >{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      )}

      <ScrollArea className="mt-2 flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-3">
          {(convosQ.data || []).map((c) => {
            const active = pathname === `/c/${c.id}`
            return (
              <div
                key={c.id}
                className={cn(
                  'group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all duration-200 ease-in-out',
                  active
                    ? 'border-l-2 border-primary bg-white/10 text-white font-medium shadow-sm shadow-black/10'
                    : 'border-l-2 border-transparent text-sidebar-foreground/80 hover:border-primary/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                {!collapsed && (
                  editingId === c.id ? (
                    <Input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => { rename.mutate({ id: c.id, title: editingTitle || c.title }); setEditingId(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { rename.mutate({ id: c.id, title: editingTitle || c.title }); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="h-6 border-white/10 bg-white/5 text-xs"
                    />
                  ) : (
                    <Link href={`/c/${c.id}`} className="flex-1 truncate">
                      {c.title}
                    </Link>
                  )
                )}
                {!collapsed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => { setEditingId(c.id); setEditingTitle(c.title) }}>
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFav.mutate({ id: c.id, favorite: !c.favorite })}>
                        <Star className={cn('h-3.5 w-3.5', c.favorite && 'fill-yellow-400 text-yellow-400')} />
                        {c.favorite ? 'Unfavorite' : 'Favorite'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Delete this chat?')) remove.mutate(c.id)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )
          })}
        </div>

        {!collapsed && (
          <>
            <div className="my-4 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="mt-3 px-2">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wider text-sidebar-foreground/50">
                <span>Folders</span>
                <button onClick={() => createFolder.mutate()} className="rounded p-0.5 hover:bg-white/10">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setFolderId(null)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm',
                    folderId === null ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5'
                  )}
                >
                  <Folder className="h-3.5 w-3.5" /> All
                </button>
                {(foldersQ.data || []).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm',
                      folderId === f.id ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5'
                    )}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-sidebar-foreground/40">{f.conversationCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </ScrollArea>

      <div className="border-t border-white/5 p-2">
        {!collapsed && (
          <div className="mb-1 grid grid-cols-2 gap-1">
            <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
              <Link href="/canvas"><FileText className="h-3.5 w-3.5" /> Canvases</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
              <Link href="/research"><Sparkles className="h-3.5 w-3.5" /> Research</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
              <Link href="/settings"><Settings className="h-3.5 w-3.5" /> Settings</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
              <Link href="/profile"><UserIcon className="h-3.5 w-3.5" /> Profile</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
              <Link href="/security"><Shield className="h-3.5 w-3.5" /> Security</Link>
            </Button>
            {isAdmin(user?.role) && (
              <Button variant="ghost" size="sm" asChild className="justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
                <Link href="/admin"><Users className="h-3.5 w-3.5" /> Admin</Link>
              </Button>
            )}
            {isDeveloper(user?.role) && (
              <Button variant="ghost" size="sm" asChild className="col-span-2 justify-start text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
                <Link href="/developer">Developer panel</Link>
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-medium text-white">
            {(user?.username || '?').slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-white">{user?.username}</div>
                <div className="truncate text-[10px] text-sidebar-foreground/50">{user?.email}</div>
              </div>
              <button
                onClick={async () => { await logout(); router.push('/login') }}
                className="rounded p-1 text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
