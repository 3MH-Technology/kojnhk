'use client'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useUIStore } from '@/stores/ui'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { retry: 0 },
    },
  }))

  React.useEffect(() => {
    const theme = useUIStore.getState().theme
    const apply = (t: 'light' | 'dark' | 'system') => {
      const root = document.documentElement
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', isDark)
    }
    apply(theme)
    const unsub = useUIStore.subscribe((s) => apply(s.theme))
    return () => unsub()
  }, [])

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  )
}
