'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('app error:', error)
  }, [error])
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-[0.04]" />
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && <p className="mt-1 font-mono text-xs text-muted-foreground">ref: {error.digest}</p>}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/"><Home className="h-4 w-4" /> Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
