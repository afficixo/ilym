'use client'

import Image from 'next/image'
import MessageBody from '@/components/support/MessageBody'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useState, useEffect, useRef, type MouseEvent } from 'react'
import {
  LayoutDashboard,
  Plus,
  Package,
  Globe2,
  Link2,
  LogOut,
  BarChart3,
  ShieldCheck,
  Layers,
  WalletCards,
  Webhook,
  Zap,
  X,
  MessageCircle,
  Loader2,
  Send,
  UsersRound,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react'
import { getDashboardPath } from '@/lib/auth/dashboard-path'
import { applyDashboardTheme } from '@/lib/dashboard-theme'

type SupportMessage = { id: string; body: string; sender: { role: string } }
type SupportConversation = { id: string; messages: SupportMessage[] }

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export default function Sidebar({ collapsed, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [linkAccountsOpen, setLinkAccountsOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportConversation, setSupportConversation] = useState<SupportConversation | null>(null)
  const [supportBody, setSupportBody] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSending, setSupportSending] = useState(false)
  const [supportError, setSupportError] = useState('')
  const [supportUnread, setSupportUnread] = useState(false)
  const supportOpenRef = useRef(supportOpen)
  const latestOwnerMessageIdRef = useRef<string | null>(null)
  const supportInitializedRef = useRef(false)
  const supportTranscriptRef = useRef<HTMLDivElement>(null)
  const isDarkRef = useRef(isDark)

  useEffect(() => {
    supportOpenRef.current = supportOpen
  }, [supportOpen])

  useEffect(() => {
    isDarkRef.current = isDark
  }, [isDark])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    onMobileOpenChange(false)
  }, [onMobileOpenChange, pathname])

  useEffect(() => {
    const readTheme = () => {
      const storedTheme = window.localStorage.getItem('theme')
      const shouldUseDark = storedTheme
        ? storedTheme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
      isDarkRef.current = shouldUseDark
      setIsDark(shouldUseDark)
      document.documentElement.classList.toggle('dark', shouldUseDark)
    }

    readTheme()
    window.addEventListener('storage', readTheme)
    window.addEventListener('themechange', readTheme)
    return () => {
      window.removeEventListener('storage', readTheme)
      window.removeEventListener('themechange', readTheme)
    }
  }, [])

  useEffect(() => {
    if (userRole !== 'MANAGER') return
    let active = true
    const refreshSupport = async (showLoading = false) => {
      if (showLoading) setSupportLoading(true)
      try {
        const response = await fetch('/api/support', { credentials: 'include', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load messages.')
        if (active) {
          const conversation = data.conversations[0] || null
          const latestOwnerMessage = [...(conversation?.messages || [])].reverse().find((message) => message.sender.role === 'OWNER')
          if (!supportInitializedRef.current) {
            latestOwnerMessageIdRef.current = latestOwnerMessage?.id || null
            supportInitializedRef.current = true
            if (latestOwnerMessage && conversation) {
              if (supportOpenRef.current) {
                window.localStorage.setItem(`support-last-seen-message:${conversation.id}`, latestOwnerMessage.id)
              } else if (window.localStorage.getItem(`support-last-seen-message:${conversation.id}`) !== latestOwnerMessage.id) {
                setSupportUnread(true)
              }
            }
          } else if (latestOwnerMessage && latestOwnerMessage.id !== latestOwnerMessageIdRef.current) {
            latestOwnerMessageIdRef.current = latestOwnerMessage.id
            if (supportOpenRef.current && conversation) {
              window.localStorage.setItem(`support-last-seen-message:${conversation.id}`, latestOwnerMessage.id)
            } else {
              setSupportUnread(true)
            }
          }
          setSupportConversation(conversation)
          setSupportError('')
        }
      } catch (loadError) {
        if (active) setSupportError(loadError instanceof Error ? loadError.message : 'Unable to load messages.')
      } finally {
        if (active && showLoading) setSupportLoading(false)
      }
    }

    refreshSupport(true)
    const interval = window.setInterval(refreshSupport, 2000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [userRole])

  useEffect(() => {
    if (!supportOpen || !supportTranscriptRef.current) return
    supportTranscriptRef.current.scrollTop = supportTranscriptRef.current.scrollHeight
  }, [supportOpen, supportConversation?.messages.length])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (!response.ok) return
        const data = await response.json()
        setUserRole(data?.role ?? null)
      } catch {
        setUserRole(null)
      }
    }

    fetchUser()
  }, [])

  const dashboardBasePath = '/admin'
  const isLinkAccountsRoute =
    pathname === `${dashboardBasePath}/links` ||
    pathname?.startsWith(`${dashboardBasePath}/links/`) ||
    pathname === `${dashboardBasePath}/landing-builder`

  useEffect(() => {
    if (isLinkAccountsRoute) setLinkAccountsOpen(true)
  }, [isLinkAccountsRoute])

  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { href: getDashboardPath(userRole), label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Link accounts',
      items: [
        { href: `${dashboardBasePath}/links/create`, label: 'Create', icon: Plus },
        { href: `${dashboardBasePath}/links/create-turbo`, label: 'Bulk Create', icon: Zap },
        { href: `${dashboardBasePath}/links`, label: 'All Link Accounts', icon: Link2, exact: true },
        { href: `${dashboardBasePath}/landing-builder`, label: 'Landing Builder', icon: Layers },
      ],
    },
    {
      label: 'Operations',
      items: [
        ...(userRole !== 'MANAGER'
          ? [{ href: `${dashboardBasePath}/offers`, label: 'Offer Vault', icon: Package }]
          : []),
        ...(userRole !== 'MANAGER'
          ? [{ href: `${dashboardBasePath}/domains`, label: 'Custom Domains', icon: Globe2 }]
          : []),
        { href: `${dashboardBasePath}/analytics`, label: 'Analytics', icon: BarChart3 },
        ...(userRole !== 'MANAGER'
          ? [{ href: `${dashboardBasePath}/postbacks`, label: 'S2S Postbacks', icon: Webhook }]
          : []),
        {
          href: userRole === 'OWNER' ? '/owner/url-shortener' : `${dashboardBasePath}/url-shortener`,
          label: 'URL Shortener',
          icon: Link2,
        },
        ...(userRole === 'OWNER'
          ? [{ href: `${dashboardBasePath}/templates`, label: 'Templates', icon: Layers }]
          : []),
      ],
    },
    {
      label: 'Finance',
      items: [
        {
          href: userRole === 'OWNER'
            ? '/owner/payments'
            : userRole === 'MANAGER'
              ? '/publisher/payments'
              : `${dashboardBasePath}/payments`,
          label: 'Payments',
          icon: WalletCards,
        },
        ...(userRole === 'MANAGER'
          ? [{ href: '/publisher/referrals', label: 'Referrals', icon: UsersRound }]
          : []),
      ],
    },
    {
      label: 'System',
      items: [
        ...(userRole === 'OWNER'
          ? [
              { href: '/owner/manager-controls', label: 'Publisher Controls', icon: ShieldCheck },
              { href: '/owner/managers', label: 'Manage Publishers', icon: ShieldCheck },
              { href: '/owner/admins', label: 'Manage Admins', icon: UsersRound },
            ]
          : []),
      ],
    },
  ]

  if (isMobile === null) {
    return <div className="hidden w-[var(--dashboard-sidebar-width)] shrink-0 lg:block" aria-hidden="true" />
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const nextIsDark = !isDarkRef.current
    isDarkRef.current = nextIsDark
    setIsDark(nextIsDark)
    applyDashboardTheme(nextIsDark, event.currentTarget)
  }

  const sendSupportMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!supportBody.trim()) return
    setSupportSending(true)
    setSupportError('')
    try {
      const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: supportBody }), credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send message.')
      setSupportConversation(data.conversation)
      setSupportBody('')
    } catch (sendError) {
      setSupportError(sendError instanceof Error ? sendError.message : 'Unable to send message.')
    } finally {
      setSupportSending(false)
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#f3f6f5] text-[#263238] transition-colors duration-200 motion-reduce:transition-none dark:bg-[#192326] dark:text-slate-100">
      <nav
        aria-label="Primary navigation"
        className="relative z-10 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2.5 py-4 lg:space-y-3 lg:px-2 lg:py-3"
      >
        {menuGroups.map((group) => group.items.length > 0 && (
          <div key={group.label} className="space-y-1.5 lg:space-y-1">
            {group.label !== 'Link accounts' && (!collapsed || isMobile) && (
              <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 first:pt-0 dark:text-slate-500">
                {group.label}
              </p>
            )}
            {group.label === 'Link accounts' && (!collapsed || isMobile) && (
                <button
                  type="button"
                  aria-expanded={linkAccountsOpen}
                  aria-controls="link-accounts-menu"
                  onClick={() => setLinkAccountsOpen((open) => !open)}
                  className="group flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-left text-[13px] font-semibold tracking-[0.005em] text-sky-800 transition-colors duration-200 hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:border-sky-400/35 dark:hover:bg-sky-400/[0.15] lg:min-h-9 lg:py-1.5"
                >
                  <Link2 className="h-[18px] w-[18px] shrink-0 text-sky-700 transition-colors duration-200 dark:text-sky-300 lg:h-4 lg:w-4" aria-hidden="true" />
                  <span className="flex-1">Link Accounts</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${linkAccountsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
            )}
            {(group.label !== 'Link accounts' || linkAccountsOpen || (collapsed && !isMobile)) && (
              <div
                id={group.label === 'Link accounts' ? 'link-accounts-menu' : undefined}
                className={`space-y-1.5 lg:space-y-1 ${
                  group.label === 'Link accounts' && (!collapsed || isMobile)
                    ? 'ml-4 border-l border-slate-300/80 pl-2.5 dark:border-white/15'
                    : ''
                }`}
              >
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed && !isMobile ? item.label : undefined}
                      prefetch={item.href.includes('/dashboard') || item.href.includes('/postbacks')}
                      onClick={() => {
                        if (isMobile) onMobileOpenChange(false)
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex min-h-10 w-full items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} rounded-lg border px-2.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#359f25] lg:min-h-9 lg:py-1.5 ${
                        isActive
                          ? 'border-[#359f25]/20 bg-[#e8f4e6] font-semibold text-[#1f5520] dark:border-[#5ff442]/20 dark:bg-[#5ff442]/10 dark:text-white'
                          : 'border-transparent text-[#455964] hover:border-[#4dd935]/25 hover:bg-white/90 hover:text-[#24651d] dark:text-slate-300 dark:hover:border-[#5ff442]/20 dark:hover:bg-[#5ff442]/[0.08] dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 lg:h-4 lg:w-4 ${isActive ? 'text-[#24651d] dark:text-[#a2fa8e]' : 'text-slate-500 group-hover:text-[#359f25] dark:text-slate-400 dark:group-hover:text-[#a2fa8e]'}`} />
                      {(!collapsed || isMobile) && <span className="truncate text-[13px] font-medium tracking-[0.005em]">{item.label}</span>}
                      {isActive && (!collapsed || isMobile) && (
                        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#359f25] dark:bg-[#5ff442]" />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={`relative z-10 flex-shrink-0 border-t border-[#263238]/10 dark:border-white/10 ${isMobile ? 'space-y-1 px-2 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2' : 'space-y-0.5 px-2 py-2'}`}>
        <button
          type="button"
          onClick={toggleTheme}
          data-theme-toggle="sidebar"
          className={`relative group flex min-h-10 w-full items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} rounded-lg border border-transparent px-2.5 py-2 text-[#455964] transition-colors duration-200 hover:bg-white/90 hover:text-[#24651d] dark:text-slate-300 dark:hover:bg-[#5ff442]/[0.08] dark:hover:text-white`}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={collapsed && !isMobile ? (isDark ? 'Light theme' : 'Dark theme') : undefined}
        >
          <span className="relative grid h-5 w-5 shrink-0 place-items-center">
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
          {(!collapsed || isMobile) && <span className="text-[13px] font-medium tracking-[0.01em]">{isDark ? 'Light theme' : 'Dark theme'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`group flex min-h-10 w-full items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} rounded-lg border border-transparent px-2.5 py-2 text-rose-700 transition-colors duration-200 hover:border-rose-700/15 hover:bg-rose-700/10 hover:text-rose-800 dark:text-rose-300 dark:hover:border-rose-300/20 dark:hover:bg-rose-300/10 dark:hover:text-rose-200`}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-5 w-5 transition-colors duration-200" />
          {(!collapsed || isMobile) && <span className="text-[13px] font-medium tracking-[0.01em]">Logout</span>}
        </button>
      </div>
    </div>
  )

  const supportShortcut = userRole === 'MANAGER' && pathname !== '/publisher/help' ? (
    <button
      type="button"
      onClick={() => setSupportOpen((open) => {
        if (!open) {
          setSupportUnread(false)
          if (supportConversation?.id && latestOwnerMessageIdRef.current) {
            window.localStorage.setItem(`support-last-seen-message:${supportConversation.id}`, latestOwnerMessageIdRef.current)
          }
        }
        return !open
      })}
      aria-label={supportOpen ? 'Close help messenger' : supportUnread ? 'Open help messenger, new message' : 'Open help messenger'}
      aria-expanded={supportOpen}
      aria-controls="support-messenger-popup"
      title="Get Help"
      className={`group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5ff442]/25 sm:right-6 ${supportOpen ? 'border-[#4dd935] bg-[#5ff442] text-[#263238]' : 'border-[#5ff442]/35 bg-[#263238] text-[#8aff70] hover:border-[#5ff442] hover:bg-[#1a2429]'}`}
    >
      {supportOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      {supportUnread && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-rose-400 dark:border-slate-950" aria-label="New unread message" />}
      <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Get Help</span>
    </button>
  ) : null

  const supportPopup = userRole === 'MANAGER' && pathname !== '/publisher/help' && supportOpen ? (
    <div id="support-messenger-popup" role="dialog" aria-label="Help messenger with Rafsan" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 dark:border-white/10 dark:bg-slate-900 sm:right-6">
      <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-white/10"><Image src="/afficix_favicon.png" alt="Afficix" fill sizes="36px" className="object-cover" /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" /></div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Rafsan</p><p className="text-[11px] text-slate-500 dark:text-slate-400">How can we help?</p></div>
        <Link href="/publisher/help" target="_blank" rel="noreferrer" className="ml-auto text-[11px] font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-300">Open full page</Link>
      </div>
      <div ref={supportTranscriptRef} className="h-64 space-y-1.5 overflow-y-auto bg-slate-50/70 p-3 dark:bg-slate-950/30">
        {supportLoading && <div className="flex h-full items-center justify-center text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-500" />Loading...</div>}
        {!supportLoading && !supportConversation && <div className="flex h-full items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">Send a message to start a private conversation.</div>}
        {supportConversation?.messages.map((message, index) => {
          const isManagerMessage = message.sender.role === 'MANAGER'
          const previousMessage = supportConversation.messages[index - 1]
          const showOwnerAvatar = !isManagerMessage && (index === 0 || previousMessage?.sender.role === 'MANAGER')
          return <div key={message.id} className={`flex items-end gap-1.5 ${isManagerMessage ? 'justify-end' : 'justify-start'}`}>{!isManagerMessage && <div className={`flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-white/10 ${showOwnerAvatar ? '' : 'invisible'}`}><Image src="/afficix_favicon.png" alt="Afficix" width={20} height={20} className="h-full w-full object-cover" /></div>}<div className={`max-w-[78%] whitespace-pre-wrap break-words px-3 py-2 text-xs leading-5 ${isManagerMessage ? 'rounded-xl rounded-br-sm bg-cyan-500 text-slate-950' : `rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 ${showOwnerAvatar ? 'rounded-bl-sm' : 'rounded-l-md'}`}`}><MessageBody body={message.body} /></div></div>
        })}
      </div>
      {supportError && <p className="border-t border-red-500/15 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">{supportError}</p>}
      <form onSubmit={sendSupportMessage} className="flex items-end gap-2 border-t border-slate-200/70 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><textarea value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder="Write a message..." aria-label="Message to Rafsan" rows={2} maxLength={5000} className="min-h-12 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 focus-visible:outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-white" /><button type="submit" disabled={supportSending || !supportBody.trim()} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"><Send className="h-4 w-4" /></button></form>
    </div>
  ) : null

  if (isMobile) {
    return (
      <>
        {supportPopup}
        {supportShortcut}
        <aside
          id="dashboard-mobile-sidebar"
          className={`panel-bleed fixed inset-x-0 top-14 z-[50] flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden border-0 border-b border-[#263238]/10 bg-[#f3f6f5] shadow-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out dark:border-white/10 dark:bg-[#192326] lg:hidden ${
            mobileOpen ? 'translate-y-0 opacity-100' : 'mobile-sidebar-closed'
          }`}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <>
      {supportPopup}
      {supportShortcut}
      <aside
        className={`panel-bleed sticky top-14 z-[50] hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col ${collapsed ? 'w-[var(--dashboard-sidebar-collapsed-width)]' : 'w-[var(--dashboard-sidebar-width)]'} overflow-hidden rounded-none border-0 border-r border-[#263238]/10 bg-[#f3f6f5] shadow-[8px_0_28px_rgba(38,50,56,0.05)] ring-0 transition-[width,box-shadow] duration-300 ease-out dark:border-white/10 dark:bg-[#192326] dark:shadow-[8px_0_28px_rgba(0,0,0,0.24)] lg:flex`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}