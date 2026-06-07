'use client'
import * as React from 'react'

export function useTheme(): boolean {
  const [dark, setDark] = React.useState(false)
  React.useEffect(() => {
    const root = document.documentElement
    setDark(root.classList.contains('dark'))
    const obs = new MutationObserver(() => setDark(root.classList.contains('dark')))
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}
