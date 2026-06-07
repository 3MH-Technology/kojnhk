'use client'
import * as React from 'react'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function PendingPage() {
  const router = useRouter()
  const { user, logout, refreshMe } = useAuthStore()
  const [busy, setBusy] = React.useState(false)

  async function check() {
    setBusy(true)
    try {
      await refreshMe()
      const r = await api.get('/auth/me')
      if (r.data.status === 'approved') router.replace('/c')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <CardTitle>Account pending</CardTitle>
          <CardDescription>
            Your account is currently <strong>{user?.status}</strong>. An administrator will review your registration shortly.
            You will receive a notification when your account is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={check} disabled={busy} className="flex-1"><RefreshCw className="h-4 w-4" /> Check status</Button>
          <Button variant="outline" onClick={async () => { await logout(); router.push('/login') }}><LogOut className="h-4 w-4" /> Sign out</Button>
        </CardContent>
      </Card>
    </div>
  )
}
