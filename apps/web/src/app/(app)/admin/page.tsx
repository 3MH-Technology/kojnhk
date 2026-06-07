'use client'
import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, Bot, AlertCircle, Coins, Activity, UserPlus, ScrollText, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { AdminStats, AuditLogRecord, PublicUser, ErrorEvent } from '@/lib/types'
import { formatNumber, formatRelative } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function AdminOverviewPage() {
  const sQ = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get<AdminStats>('/admin/stats')).data,
    refetchInterval: 15_000,
  })

  const cards = [
    { title: 'Total users', value: sQ.data?.totalUsers, icon: Users, color: 'from-blue-500 to-indigo-500' },
    { title: 'Active 24h', value: sQ.data?.activeUsers24h, icon: Activity, color: 'from-emerald-500 to-teal-500' },
    { title: 'Pending users', value: sQ.data?.pendingUsers, icon: AlertCircle, color: 'from-amber-500 to-orange-500' },
    { title: 'Conversations', value: sQ.data?.totalConversations, icon: MessageSquare, color: 'from-violet-500 to-fuchsia-500' },
    { title: 'Messages', value: sQ.data?.totalMessages, icon: MessageSquare, color: 'from-pink-500 to-rose-500' },
    { title: 'Tokens used', value: sQ.data?.totalTokens, icon: Coins, color: 'from-cyan-500 to-sky-500' },
    { title: 'Tokens today', value: sQ.data?.tokensToday, icon: Coins, color: 'from-teal-500 to-emerald-500' },
    { title: 'Active models', value: sQ.data?.activeModels, icon: Bot, color: 'from-amber-500 to-yellow-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin overview</h1>
          <p className="text-sm text-muted-foreground">Real-time platform metrics.</p>
        </div>
        <span className="text-xs text-muted-foreground">Updated {sQ.data ? new Date(sQ.data.generatedAt).toLocaleTimeString() : '—'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br ${c.color} text-white shadow-sm`}>
                  <c.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{c.title}</div>
                  <div className="text-xl font-semibold">{c.value === undefined || c.value === null ? '—' : formatNumber(c.value)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentRegistrations users={sQ.data?.recentRegistrations || []} />
        <RecentAudit events={sQ.data?.recentAudit || []} />
        <RecentErrors events={sQ.data?.recentErrors || []} />
      </div>
    </div>
  )
}

function RecentRegistrations({ users }: { users: PublicUser[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> Recent registrations</CardTitle>
        <Button asChild size="sm" variant="ghost"><Link href="/admin/users">All <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.length === 0 ? <Empty text="No registrations yet." /> :
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-md border border-border/50 p-2 text-sm">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-[10px] font-medium text-white">
                {u.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate">{u.username}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <Badge variant={u.status === 'approved' ? 'success' : u.status === 'pending' ? 'warning' : 'destructive'}>{u.status}</Badge>
            </div>
          ))
        }
      </CardContent>
    </Card>
  )
}

function RecentAudit({ events }: { events: AuditLogRecord[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4" /> Recent audit</CardTitle>
        <Button asChild size="sm" variant="ghost"><Link href="/admin/audit">All <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {events.length === 0 ? <Empty text="No audit events." /> :
          events.slice(0, 8).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{formatRelative(e.timestamp)}</span>
              <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono">{e.action}</span>
              <span className="truncate text-muted-foreground">{(e.actorUsername || e.actorId || 'system')}</span>
            </div>
          ))
        }
      </CardContent>
    </Card>
  )
}

function RecentErrors({ events }: { events: ErrorEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Recent errors</CardTitle>
        <Button asChild size="sm" variant="ghost"><Link href="/admin/errors">All <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {events.length === 0 ? <Empty text="No errors. All systems healthy." /> :
          events.slice(0, 8).map((e) => (
            <div key={e.id} className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{e.status || 'ERR'}</Badge>
                <span className="font-mono">{e.method} {e.path}</span>
                <span className="ml-auto text-muted-foreground">{formatRelative(e.createdAt)}</span>
              </div>
              <div className="mt-1 line-clamp-2 text-muted-foreground">{e.message}</div>
            </div>
          ))
        }
      </CardContent>
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">{text}</div>
}
