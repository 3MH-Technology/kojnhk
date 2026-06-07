'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { isDeveloper } from '@/lib/utils'
import { DeveloperSidebar } from '@/components/layout/developer-sidebar'
import { Loader2 } from 'lucide-react'

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthStore()

  React.useEffect(() => {
    if (user && !isDeveloper(user.role)) router.replace('/c')
  }, [user, router])

  if (!user || !isDeveloper(user.role)) {
    return <div className="grid h-screen w-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DeveloperSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
