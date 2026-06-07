'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { isAdmin } from '@/lib/utils'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthStore()

  React.useEffect(() => {
    if (user && !isAdmin(user.role)) router.replace('/c')
  }, [user, router])

  if (!user || !isAdmin(user.role)) {
    return <div className="grid h-screen w-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
