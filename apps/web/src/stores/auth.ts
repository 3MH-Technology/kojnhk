'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PublicUser } from '@/lib/types'
import { api, clearTokens, getRefreshToken, setTokens } from '@/lib/api'

interface AuthState {
  user: PublicUser | null
  isLoading: boolean
  setUser: (u: PublicUser | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (u) => set({ user: u }),
      async login(email, password) {
        set({ isLoading: true })
        try {
          const r = await api.post('/auth/login', { email, password })
          setTokens(r.data.accessToken, r.data.refreshToken)
          set({ user: r.data.user })
        } finally {
          set({ isLoading: false })
        }
      },
      async register(username, email, password) {
        set({ isLoading: true })
        try {
          const r = await api.post('/auth/register', { username, email, password })
          setTokens(r.data.accessToken, r.data.refreshToken)
          set({ user: r.data.user })
        } finally {
          set({ isLoading: false })
        }
      },
      async logout() {
        try { await api.post('/auth/logout', { refreshToken: getRefreshToken() || '' }) } catch {}
        clearTokens()
        set({ user: null })
      },
      async refreshMe() {
        try {
          const r = await api.get('/auth/me')
          set({ user: r.data })
        } catch {
          set({ user: null })
        }
      },
    }),
    { name: 'wormgpt.auth', partialize: (s) => ({ user: s.user }) }
  )
)
