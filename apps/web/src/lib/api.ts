/**
 * API client. Uses Next.js rewrite to /api/v1/* (see next.config.mjs).
 * Auth token is read from localStorage and attached as Bearer.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

const TOKEN_KEY = 'wormgpt.access'
const REFRESH_KEY = 'wormgpt.refresh'

export function getAccessToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access?: string, refresh?: string) {
  if (typeof window === 'undefined') return
  if (access !== undefined) localStorage.setItem(TOKEN_KEY, access)
  if (refresh !== undefined) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
})

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const method = (config.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method)) {
    const csrf = readCsrfToken()
    if (csrf) config.headers.set('x-csrf-token', csrf)
  }
  return config
})

let refreshing: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const r = await axios.post('/api/v1/auth/refresh', { refreshToken: refresh })
    const { accessToken, refreshToken } = r.data
    setTokens(accessToken, refreshToken)
    return accessToken
  } catch {
    clearTokens()
    useAuthStore.getState().logout()
    return null
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  )
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (
      status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true
      const refreshPromise = (refreshing ??= doRefresh().finally(() => {
        refreshing = null
      }))
      const token = await refreshPromise
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`)
        return api.request(original)
      }
    }
    return Promise.reject(error)
  }
)

export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data: any = e.response?.data
    if (typeof data === 'string') return data
    if (data?.detail) return Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : data.detail
    if (data?.error) return data.error
    return e.message
  }
  if (e instanceof Error) return e.message
  return 'unknown error'
}
