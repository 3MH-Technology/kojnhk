'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, FileText, ArrowLeft, Code2, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

import { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface Section {
  label: string
  items: NavItem[]
}

const SECTIONS: Section[] = [
  {
    label: 'Configuration',
    items: [
      { href: '/developer', label: 'Models', icon: Bot, exact: true },
      { href: '/developer/providers', label: 'Provider Keys', icon: Key },
    ],
  },
  {
    label: 'Prompts',
    items: [
      { href: '/developer/prompts', label: 'System Prompts', icon: FileText },
    ],
  },
]

export function DeveloperSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
          <Code2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold">Developer Panel</div>
          <div className="text-[10px] text-sidebar-foreground/50">Keys, Models &amp; Prompts</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 px-2 pt-1">
        {SECTIONS.map((section, index) => (
          <div key={section.label} className={cn(index > 0 && "pt-2")}>
            {index > 0 && (
              <div className="mx-3 mb-3 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            )}
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-white/10 font-medium text-white'
                        : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-3">
        <Link
          href="/c"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Chat
        </Link>
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5">
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-[10px] font-medium text-white">
            {(user?.username || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-white">{user?.username}</div>
            <div className="truncate text-[10px] text-sidebar-foreground/50">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
