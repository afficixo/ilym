'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { syncBrowserThemeColor } from '@/lib/dashboard-theme'

export default function ThemeInitializer() {
  const pathname = usePathname()

  useEffect(() => {
    const applyTheme = () => {
      const storedTheme = window.localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = storedTheme ? storedTheme === 'dark' : prefersDark
      document.documentElement.classList.toggle('dark', isDark)
      syncBrowserThemeColor(isDark)
    }

    applyTheme()
    window.addEventListener('storage', applyTheme)
    window.addEventListener('themechange', applyTheme)

    return () => {
      window.removeEventListener('storage', applyTheme)
      window.removeEventListener('themechange', applyTheme)
    }
  }, [])

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    syncBrowserThemeColor(storedTheme ? storedTheme === 'dark' : prefersDark)
  }, [pathname])

  return null
}
