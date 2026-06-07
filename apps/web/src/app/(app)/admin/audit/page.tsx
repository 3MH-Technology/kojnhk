'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { AuditLogRecord } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export default function AuditPage() {
  const [q, setQ] = React.useState('')
  const aQ = useQuery({
    queryKey: ['admin', 'audit', q],
    queryFn: async () => (await api.get<AuditLogRecord[]>('/admin/audit-logs', { params: { action: q || undefined, limit: 200 } })).data,
  })

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="mb-3 text-sm text-muted-foreground">Last 200 events. Filter by action prefix (e.g. <code>auth.</code>).</p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="auth., model., user., prompt." className="mb-3 max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Resource</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {(aQ.data || []).map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{formatDate(l.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td className="px-3 py-1.5 text-xs">{l.actorUsername || l.actorId}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{l.action}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{l.resource}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{l.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
