'use client'
import * as React from 'react'
import Link from 'next/link'
import { Bot, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-[0.04]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-500/20 via-blue-500/10 to-violet-500/20 blur-3xl" />
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-white shadow-md">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-7xl font-bold tracking-tight text-transparent">404</h1>
        <p className="mt-2 text-lg font-medium">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">The page you were looking for doesn&apos;t exist or has been moved.</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/"><Home className="h-4 w-4" /> Home</Link>
          </Button>
          <Button variant="outline" onClick={() => history.back()}>
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
        </div>
      </div>
    </div>
  )
}
