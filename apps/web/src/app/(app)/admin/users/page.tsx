'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Trash2, Search, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { PublicUser, UserListOut } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminUsersPage() {
  const [q, setQ] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const qc = useQueryClient()

  const listQ = useQuery({
    queryKey: ['admin', 'users', q, status, page],
    queryFn: async () => (await api.get<UserListOut>('/admin/users', {
      params: { q: q || undefined, status: status === 'all' ? undefined : status, page, size: 30 },
    })).data,
  })

  const approve = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/users/${id}/approve`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Approved') },
  })
  const reject = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/users/${id}/reject`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Rejected') },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/users/${id}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Deleted') },
  })
  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => (await api.patch(`/admin/users/${id}`, { role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search users" className="h-9 w-64 pl-7" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Joined</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(listQ.data?.items || []).map((u: PublicUser) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">
                    <Select value={u.role} onValueChange={(v) => setRole.mutate({ id: u.id, role: v })}>
                      <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="moderator">moderator</SelectItem>
                        <SelectItem value="developer">developer</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="superadmin">superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={u.status === 'approved' ? 'success' : u.status === 'pending' ? 'warning' : u.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{u.createdAt ? formatRelative(u.createdAt) : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {u.status !== 'approved' && (
                        <Button size="icon" variant="ghost" onClick={() => approve.mutate(u.id)} title="Approve">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                      )}
                      {u.status !== 'rejected' && (
                        <Button size="icon" variant="ghost" onClick={() => reject.mutate(u.id)} title="Reject">
                          <X className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete user?')) remove.mutate(u.id) }} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(listQ.data?.items || []).length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">No users found.</div>
          )}
        </CardContent>
      </Card>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total: {listQ.data?.total ?? 0}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Page {page}</span>
          <Button size="sm" variant="ghost" disabled={(listQ.data?.items.length ?? 0) < 30} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
