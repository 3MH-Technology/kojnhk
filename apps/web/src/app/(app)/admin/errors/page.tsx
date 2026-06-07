'use client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorEvent } from '@/lib/types'
import { formatRelative, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function AdminErrorsPage() {
  const q = useQuery({
    queryKey: ['admin', 'errors'],
    queryFn: async () => (await api.get<ErrorEvent[]>('/admin/errors', { params: { limit: 200 } })).data,
    refetchInterval: 10_000,
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><AlertTriangle className="h-5 w-5 text-amber-500" /> Server errors</h1>
          <p className="text-sm text-muted-foreground">Last 200 unhandled exceptions captured by the API.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {(q.data || []).map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0 align-top">
                  <td className="px-3 py-2 text-xs text-muted-foreground" title={new Date(e.createdAt).toISOString()}>
                    {formatRelative(e.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={e.status && e.status >= 500 ? 'destructive' : 'warning'}>{e.status || 'ERR'}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.path}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(q.data || []).length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">No errors recorded. </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
