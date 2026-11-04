'use client'

import Image from 'next/image'
import { useEffect, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Menu, MessageCircle, Moon, Settings, Sun, X } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { getDashboardBasePath } from '@/lib/auth/dashboard-path'
import { applyDashboardTheme } from '@/lib/dashboard-theme'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const updateTime = () => setNow(new Date())
    updateTime()
    const timer = window.setInterval(updateTime, 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const syncTheme = () => {
      const storedTheme = window.localStorage.getItem('theme')
      setIsDark(storedTheme
        ? storedTheme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    syncTheme()
    window.addEventListener('storage', syncTheme)
    window.addEventListener('themechange', syncTheme)
    return () => {
      window.removeEventListener('storage', syncTheme)
      window.removeEventListener('themechange', syncTheme)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })

        if (!isActive) return

        if (!response.ok) {
          router.push('/login')
          return
        }
        const data = await response.json()
        setUserRole(data?.role ?? null)
      } catch (error) {
        if (!isActive) return

        console.error('Dashboard auth check failed:', error)
        router.push('/login')
      }
    }

    checkAuth()

    return () => {
      isActive = false
    }
  }, [router])

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const nextIsDark = !document.documentElement.classList.contains('dark')
    applyDashboardTheme(nextIsDark, event.currentTarget)
    setIsDark(nextIsDark)
  }

  return (
    <div className="dashboard-shell flex h-dvh flex-col overflow-hidden bg-[var(--page-bg)] transition-colors duration-200 motion-reduce:transition-none">
      <a
        href="#main-content"
        className="absolute left-3 top-2 z-[100] -translate-y-[150%] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg outline-none ring-2 ring-emerald-600 transition-transform focus:translate-y-0 focus-visible:ring-2 dark:bg-slate-900 dark:text-white"
      >
        Skip to content
      </a>
      <header className="relative z-[60] flex h-14 w-full shrink-0 border-b border-[#263238]/10 bg-white shadow-[0_2px_8px_rgba(38,50,56,0.05)] transition-colors duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-[#202b2f] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <div className={`hidden h-full shrink-0 items-center border-r border-[#263238]/10 bg-[#f3f6f5] px-3 transition-[width] duration-300 dark:border-white/10 dark:bg-[#192326] lg:flex ${sidebarCollapsed ? 'w-[var(--dashboard-sidebar-collapsed-width)] justify-center' : 'w-[var(--dashboard-sidebar-width)] justify-between'}`}>
          {!sidebarCollapsed && (
            <Image
              src="/afficixlogo.png"
              alt="Afficix logo"
              width={1275}
              height={482}
              className="h-12 w-36 shrink-0 object-contain"
              priority
            />
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#263238]/15 bg-white text-[#455964] transition-colors hover:border-[#4dd935]/60 hover:bg-[#efffec] hover:text-[#24651d] dark:border-white/15 dark:bg-[#263238] dark:text-slate-200 dark:hover:border-[#5ff442]/50 dark:hover:bg-[#5ff442]/10 dark:hover:text-[#a2fa8e]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <Image
              src="/afficixlogo.png"
              alt="Afficix logo"
              width={1275}
              height={482}
              className="h-7 w-[76px] shrink-0 object-contain min-[360px]:w-[92px] sm:h-9 sm:w-[124px] lg:hidden"
              priority
            />
            {now && (
              <time
                aria-label={`Local time ${now.toLocaleTimeString('en-GB', { hourCycle: 'h23' })}`}
                dateTime={now.toISOString()}
                className="flex h-9 shrink-0 items-center gap-0 px-0.5 text-slate-900 sm:h-10 sm:items-start sm:gap-1.5 sm:px-2 dark:text-white"
              >
                {[
                  { value: String(now.getHours()).padStart(2, '0'), label: 'HOUR' },
                  { value: String(now.getMinutes()).padStart(2, '0'), label: 'MIN' },
                  { value: String(now.getSeconds()).padStart(2, '0'), label: 'SEC' },
                ].map(({ value, label }, index) => (
                  <span key={label} className="flex items-start">
                    <span className="flex min-w-0 flex-col items-center leading-none sm:min-w-[42px]">
                      <span className="font-mono text-[13px] font-medium tabular-nums tracking-tight sm:text-[28px]">
                        {value}
                      </span>
                      <span className="mt-0.5 hidden text-[7px] font-medium text-slate-900 sm:block sm:text-[10px] dark:text-slate-200">
                        {label}
                      </span>
                    </span>
                    {index < 2 && (
                      <span className="pt-0.5 font-sans text-[11px] leading-none text-[#999] sm:pt-1 sm:text-[22px]" aria-hidden="true">:</span>
                    )}
                  </span>
                ))}
              </time>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <nav aria-label="Quick links" className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <Link
                href={`${getDashboardBasePath(userRole)}/settings`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-[#a2fa8e] min-[360px]:h-8 min-[360px]:w-8 sm:h-9 sm:w-9"
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="h-4 w-4 sm:h-[17px] sm:w-[17px]" aria-hidden="true" />
              </Link>
              {userRole === 'OWNER' && (
                <Link
                  href="/owner/support"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-[#a2fa8e] min-[360px]:h-8 min-[360px]:w-8 sm:h-9 sm:w-9"
                  aria-label="Support Inbox"
                  title="Support Inbox"
                >
                  <MessageCircle className="h-4 w-4 sm:h-[17px] sm:w-[17px]" aria-hidden="true" />
                </Link>
              )}
            </nav>
            <span className="mx-0.5 h-4 w-px bg-[#263238]/15 dark:bg-white/15" aria-hidden="true" />
            <button
              type="button"
              onClick={toggleTheme}
              data-theme-toggle="header"
              className="relative flex h-7 w-7 items-center justify-center rounded-lg text-[#455964] transition-colors hover:bg-white hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:text-[#a2fa8e] dark:hover:bg-white/[0.08] dark:hover:text-[#c4ffb4] min-[360px]:h-8 min-[360px]:w-8 sm:h-9 sm:w-9"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span className="relative grid h-[18px] w-[18px] place-items-center sm:h-5 sm:w-5">
                <Sun
                  aria-hidden="true"
                  className={`absolute h-full w-full text-amber-500 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none dark:text-amber-300 ${
                    isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-45 scale-75 opacity-0'
                  }`}
                />
                <Moon
                  aria-hidden="true"
                  className={`absolute h-full w-full text-indigo-500 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none dark:text-sky-200 ${
                    isDark ? '-rotate-45 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#455964] transition-colors hover:bg-white hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-[#a2fa8e] min-[360px]:h-8 min-[360px]:w-8 lg:hidden sm:h-9 sm:w-9"
              aria-label={mobileMenuOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={mobileMenuOpen}
              aria-controls="dashboard-mobile-sidebar"
            >
              {mobileMenuOpen ? <X className="h-[18px] w-[18px] sm:h-5 sm:w-5" /> : <Menu className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onMobileOpenChange={setMobileMenuOpen}
          mobileOpen={mobileMenuOpen}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main-content" tabIndex={-1} data-page-loader-region className="relative flex min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 transition-colors duration-200 motion-reduce:transition-none sm:px-4 sm:py-5 lg:px-6 lg:py-6 2xl:px-8">
            <div className="mx-auto w-full max-w-[1920px] min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}