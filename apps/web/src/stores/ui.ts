'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  selectedModelId: string | null
  toggleSidebar: () => void
  toggleCollapsed: () => void
  setTheme: (t: UIState['theme']) => void
  setModel: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      selectedModelId: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (t) => set({ theme: t }),
      setModel: (id) => set({ selectedModelId: id }),
    }),
    { name: 'wormgpt.ui' }
  )
)
