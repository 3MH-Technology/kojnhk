'use client'
import * as React from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'

export default function CanvasLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        {children}
      </div>
    </>
  )
}
