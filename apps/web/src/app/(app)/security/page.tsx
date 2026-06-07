'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, Monitor, Smartphone, LogOut, Trash2, KeyRound, Loader2, Globe } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import { SessionRecord } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

function parseUA(ua: string): { browser: string; os: string; isMobile: boolean } {
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua)
  let browser = 'Unknown'
  let os = 'Unknown'
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'
  else if (ua.includes('python-requests')) browser = 'python-requests'
  else if (ua.includes('Qoder')) browser = 'Qoder'
  if (ua.includes('Windows NT')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  return { browser, os, isMobile }
}

export default function SecurityPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()
  const [oldPw, setOldPw] = React.useState('')
  const [newPw, setNewPw] = React.useState('')

  const sessionsQ = useQuery({
    queryKey: ['security', 'sessions'],
    queryFn: async () => (await api.get<SessionRecord[]>('/security/sessions')).data,
  })

  const revoke = useMutation({
    mutationFn: async (id: string) => { await api.post(`/security/sessions/${id}/revoke`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security', 'sessions'] }),
    onError: (e) => toast.error(apiError(e)),
  })
  const revokeOthers = useMutation({
    mutationFn: async () => { await api.post('/security/sessions/revoke-others') },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security', 'sessions'] }),
    onError: (e) => toast.error(apiError(e)),
  })
  const logoutAll = useMutation({
    mutationFn: async () => { await api.post('/auth/logout-all') },
    onSuccess: async () => {
      await logout()
      router.push('/login')
    },
    onError: (e) => toast.error(apiError(e)),
  })
  const cleanup = useMutation({
    mutationFn: async () => { await api.post('/security/sessions/cleanup') },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security', 'sessions'] })
      toast.success('Old sessions deleted')
    },
    onError: (e) => toast.error(apiError(e)),
  })
  const changePw = useMutation({
    mutationFn: async () => { await api.post('/auth/change-password', { oldPassword: oldPw, newPassword: newPw }) },
    onSuccess: () => { setOldPw(''); setNewPw(''); toast.success('Password changed') },
    onError: (e) => toast.error(apiError(e)),
  })

  function deviceIcon(ua: string | null | undefined) {
    if (!ua) return <Monitor className="h-4 w-4" />
    if (ua.includes('python-requests')) return <Globe className="h-4 w-4" />
    if (ua.includes('Qoder')) return <Globe className="h-4 w-4" />
    const { isMobile } = parseUA(ua)
    return isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
  }

  function formatUA(ua: string | null | undefined): string {
    if (!ua) return 'Unknown device'
    return ua
  }

  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold"><ShieldAlert className="h-5 w-5 text-primary" /> Security</h1>
              <p className="text-sm text-muted-foreground">Active sessions, devices, and password.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active sessions</CardTitle>
                <CardDescription>Devices and browser sessions currently signed in to your account.</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsQ.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <div className="space-y-2">
                  {(sessionsQ.data || []).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
                        {deviceIcon(s.userAgent)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-mono text-foreground/90">{s.userAgent ? formatUA(s.userAgent) : 'Unknown device'}</span>
                          {s.current && <Badge variant="success">this device</Badge>}
                          {s.kind === 'session' && <Badge variant="outline">session</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.ip || '127.0.0.1'} · last seen {s.lastSeen ? formatRelative(s.lastSeen) : '—'}
                        </div>
                      </div>
                      {!s.current && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke.mutate(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => revokeOthers.mutate()} disabled={revokeOthers.isPending}>
                    Revoke all other sessions
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await logout(); router.push('/login') }}>
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Choose a strong password (min 8 characters).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Current password</label>
                  <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">New password</label>
                  <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </div>
                <Button onClick={() => changePw.mutate()} disabled={!oldPw || !newPw || changePw.isPending}>
                  <KeyRound className="h-4 w-4" /> Update password
                </Button>
                <p className="text-xs text-muted-foreground">
                  Forgot your password? <Link href="/forgot" className="text-primary hover:underline">Reset via email</Link>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Signed in as <strong>{user?.email}</strong></CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="destructive" onClick={() => logoutAll.mutate()} disabled={logoutAll.isPending}>
                  <LogOut className="h-4 w-4" /> Sign out everywhere
                </Button>
                <Button variant="outline" onClick={() => cleanup.mutate()} disabled={cleanup.isPending}>
                  <Trash2 className="h-4 w-4" /> Delete old sessions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
