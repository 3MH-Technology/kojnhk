'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { NotificationRecord } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const qc = useQueryClient()
  const listQ = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<NotificationRecord[]>('/notifications')).data,
  })
  const read = useMutation({
    mutationFn: async (id: string) => { await api.post(`/notifications/${id}/read`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const readAll = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-xl font-semibold"><Bell className="h-5 w-5" /> Notifications</h1>
              <Button variant="outline" size="sm" onClick={() => readAll.mutate()}>Mark all read</Button>
            </div>
            <div className="space-y-2">
              {(listQ.data || []).map((n) => (
                <Card key={n.id} className={cn('transition-colors', !n.read && 'border-primary/30 bg-primary/5')}>
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', {
                      'bg-blue-500': n.kind === 'info',
                      'bg-emerald-500': n.kind === 'success',
                      'bg-amber-500': n.kind === 'warning',
                      'bg-red-500': n.kind === 'error',
                    })} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    </div>
                    {!n.read && (
                      <Button size="icon" variant="ghost" onClick={() => read.mutate(n.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(listQ.data || []).length === 0 && (
                <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">No notifications.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
