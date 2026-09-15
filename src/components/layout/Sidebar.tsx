'use client'

import Image from 'next/image'
import MessageBody from '@/components/support/MessageBody'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Plus,
  Package,
  Globe2,
  Link2,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react'
import { getDashboardBasePath, getDashboardPath } from '@/lib/auth/dashboard-path'

type SupportMessage = { id: string; body: string; sender: { role: string } }
type SupportConversation = { id: string; messages: SupportMessage[] }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
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

  useEffect(() => {
    supportOpenRef.current = supportOpen
  }, [supportOpen])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(true)
      } else {
        setCollapsed(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const readTheme = () => {
      const storedTheme = window.localStorage.getItem('theme')
      const shouldUseDark = storedTheme
        ? storedTheme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
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

  const dashboardBasePath = getDashboardBasePath(userRole)
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
        { href: `${dashboardBasePath}/links/create`, label: 'Create Link Account', icon: Plus },
        { href: `${dashboardBasePath}/links/create-turbo`, label: 'Bulk Create', icon: Zap },
        { href: `${dashboardBasePath}/links`, label: 'All Link Account', icon: Link2, exact: true },
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
      ],
    },
    {
      label: 'Workspace',
      items: [
        { href: `${dashboardBasePath}/url-shortener`, label: 'URL Shortener', icon: Link2 },
        ...(userRole === 'OWNER'
          ? [{ href: `${dashboardBasePath}/templates`, label: 'Templates', icon: Layers }]
          : []),
      ],
    },
    {
      label: 'Finance',
      items: [{ href: `${dashboardBasePath}/payments`, label: 'Payments', icon: WalletCards }],
    },
    {
      label: 'System',
      items: [
        { href: `${dashboardBasePath}/settings`, label: 'Settings', icon: Settings },
        ...(userRole === 'OWNER'
          ? [
              { href: '/owner/managers', label: 'Manage Publishers', icon: ShieldCheck },
              { href: '/owner/admins', label: 'Manage Admins', icon: UsersRound },
              { href: '/owner/support', label: 'Support Inbox', icon: MessageCircle },
            ]
          : []),
      ],
    },
  ]

  if (isMobile === null) {
    return <div className="hidden shrink-0 lg:block lg:w-52" aria-hidden="true" />
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  const toggleTheme = () => {
    const nextIsDark = !isDark
    setIsDark(nextIsDark)
    document.documentElement.classList.toggle('dark', nextIsDark)
    window.localStorage.setItem('theme', nextIsDark ? 'dark' : 'light')
    window.dispatchEvent(new Event('themechange'))
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
    <div className="flex flex-col h-full">
      <div className={`relative flex w-full flex-shrink-0 items-center gap-3 ${isMobile ? 'h-[4.5rem] border-b border-slate-200/80 dark:border-white/10 px-5' : 'h-10 justify-start px-2'}`}>
          {(!collapsed || isMobile) && (
            <div className="relative h-9 w-28 overflow-hidden">
              <Image
                src="/afficixo-logo.png"
                alt="Afficixo logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
      </div>

      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="relative z-10 hidden lg:flex items-center justify-center p-1 mx-2 mt-1 rounded-md border border-slate-300/70 bg-slate-900/[0.04] text-slate-500 transition-colors duration-200 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:text-cyan-200 flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      <nav className={`relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain ${isMobile ? 'space-y-1 px-2 py-2' : 'space-y-1 px-2 py-2'}`}>
        {menuGroups.map((group) => group.items.length > 0 && (
          <div key={group.label} className="space-y-1">
            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon
              const iconColor = {
                'Manage Publishers': 'text-amber-600 dark:text-amber-300',
                Dashboard: 'text-lime-600 dark:text-lime-300',
                'Create Link Account': 'text-cyan-600 dark:text-cyan-300',
                'Bulk Create': 'text-violet-600 dark:text-violet-300',
                'All Link Account': 'text-sky-600 dark:text-sky-300',
                'Offer Vault': 'text-orange-600 dark:text-orange-300',
                'Custom Domains': 'text-emerald-600 dark:text-emerald-300',
                Analytics: 'text-blue-600 dark:text-blue-300',
                'S2S Postbacks': 'text-pink-600 dark:text-pink-300',
                'Landing Builder': 'text-indigo-600 dark:text-indigo-300',
                'URL Shortener': 'text-teal-600 dark:text-teal-300',
                Templates: 'text-fuchsia-600 dark:text-fuchsia-300',
                Payments: 'text-yellow-600 dark:text-yellow-300',
                Settings: 'text-slate-600 dark:text-slate-300',
                'Support Inbox': 'text-rose-600 dark:text-rose-300',
              }[item.label] || 'text-slate-600 dark:text-slate-300'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (isMobile) setMobileOpen(false)
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} ${isMobile ? 'min-h-10 rounded-md px-2.5 py-1.5 border-0' : 'rounded-md px-2 py-1.5 border'} transition-colors duration-200 ${
                    isActive
                      ? isMobile 
                        ? 'border-0 bg-slate-700 font-medium text-white dark:bg-[#344047] dark:text-slate-100'
                        : 'border-transparent bg-slate-700 font-medium text-white dark:bg-[#344047] dark:text-slate-100'
                      : isMobile
                        ? 'border-0 text-slate-600 hover:bg-slate-200/80 hover:text-slate-950 dark:text-[#b7bec2] dark:hover:bg-white/[0.06] dark:hover:text-white'
                        : 'border-transparent text-slate-600 hover:bg-slate-200/80 hover:text-slate-950 dark:text-[#b7bec2] dark:hover:bg-white/[0.06] dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-colors duration-200 ${isActive ? 'text-cyan-600 dark:text-cyan-300' : iconColor}`} />
                  {(!collapsed || isMobile) && <span className={`tracking-[0.01em] ${isMobile ? 'text-sm font-medium' : 'text-xs'}`}>{item.label}</span>}
                  {isActive && !collapsed && !isMobile && (
                    <span className="ml-auto h-5 w-0.5 rounded-full bg-cyan-300" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className={`relative z-10 flex-shrink-0 border-t ${isMobile ? 'border-slate-200/80 dark:border-white/10 space-y-1 px-2 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2' : 'border-slate-200/80 dark:border-white/10 space-y-0.5 px-2 py-2'}`}>
        <button
          type="button"
          onClick={toggleTheme}
          className={`group flex w-full items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} rounded-md border border-transparent px-2 py-1.5 text-slate-600 transition-colors duration-200 hover:bg-slate-200/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white`}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={collapsed && !isMobile ? (isDark ? 'Light theme' : 'Dark theme') : undefined}
        >
          {isDark ? <Sun className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-300" /> : <Moon className="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-300" />}
          {(!collapsed || isMobile) && <span className="text-xs tracking-[0.01em]">{isDark ? 'Light theme' : 'Dark theme'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full group flex items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2.5'} ${isMobile ? 'rounded-md px-2.5 py-1.5 min-h-10 border-0' : 'rounded-md px-2 py-1.5 border border-transparent'} transition-colors duration-200 ${isMobile ? 'text-rose-600 hover:text-rose-950 hover:bg-rose-100 font-medium dark:text-[#d6a2a2] dark:hover:text-white dark:hover:bg-white/[0.06]' : 'text-red-600/80 hover:text-red-700 hover:bg-red-500/10 hover:border-red-400/20 dark:text-red-300/80 dark:hover:text-red-200'}`}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className={`${collapsed && !isMobile ? 'w-5 h-5' : 'w-5 h-5'} transition-colors duration-200`} />
          {(!collapsed || isMobile) && <span className={`tracking-[0.01em] ${isMobile ? 'text-sm' : 'text-xs'}`}>Logout</span>}
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
      className={`group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/25 sm:right-6 ${supportOpen ? 'border-cyan-300 bg-cyan-500 text-slate-950' : 'border-cyan-400/30 bg-slate-900 text-cyan-300 hover:border-cyan-300 hover:bg-slate-800'}`}
    >
      {supportOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      {supportUnread && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-rose-400 dark:border-slate-950" aria-label="New unread message" />}
      <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Get Help</span>
    </button>
  ) : null

  const supportPopup = userRole === 'MANAGER' && pathname !== '/publisher/help' && supportOpen ? (
    <div id="support-messenger-popup" role="dialog" aria-label="Help messenger with Rayan" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 dark:border-white/10 dark:bg-slate-900 sm:right-6">
      <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-white/10"><Image src="/apple-touch-icon.png" alt="Afficixo" fill sizes="36px" className="object-cover" /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" /></div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Rayan</p><p className="text-[11px] text-slate-500 dark:text-slate-400">How can we help?</p></div>
        <Link href="/publisher/help" target="_blank" rel="noreferrer" className="ml-auto text-[11px] font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-300">Open full page</Link>
      </div>
      <div ref={supportTranscriptRef} className="h-64 space-y-1.5 overflow-y-auto bg-slate-50/70 p-3 dark:bg-slate-950/30">
        {supportLoading && <div className="flex h-full items-center justify-center text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-500" />Loading...</div>}
        {!supportLoading && !supportConversation && <div className="flex h-full items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">Send a message to start a private conversation.</div>}
        {supportConversation?.messages.map((message, index) => {
          const isManagerMessage = message.sender.role === 'MANAGER'
          const previousMessage = supportConversation.messages[index - 1]
          const showOwnerAvatar = !isManagerMessage && (index === 0 || previousMessage?.sender.role === 'MANAGER')
          return <div key={message.id} className={`flex items-end gap-1.5 ${isManagerMessage ? 'justify-end' : 'justify-start'}`}>{!isManagerMessage && <div className={`flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-white/10 ${showOwnerAvatar ? '' : 'invisible'}`}><Image src="/apple-touch-icon.png" alt="Afficixo" width={20} height={20} className="h-full w-full object-cover" /></div>}<div className={`max-w-[78%] whitespace-pre-wrap break-words px-3 py-2 text-xs leading-5 ${isManagerMessage ? 'rounded-xl rounded-br-sm bg-cyan-500 text-slate-950' : `rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 ${showOwnerAvatar ? 'rounded-bl-sm' : 'rounded-l-md'}`}`}><MessageBody body={message.body} /></div></div>
        })}
      </div>
      {supportError && <p className="border-t border-red-500/15 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">{supportError}</p>}
      <form onSubmit={sendSupportMessage} className="flex items-end gap-2 border-t border-slate-200/70 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><textarea value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder="Write a message..." aria-label="Message to Rayan" rows={2} maxLength={5000} className="min-h-12 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 focus-visible:outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-white" /><button type="submit" disabled={supportSending || !supportBody.trim()} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"><Send className="h-4 w-4" /></button></form>
    </div>
  ) : null

  if (isMobile) {
    return (
      <>
        {supportPopup}
        {supportShortcut}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          className="edge-toggle fixed right-2 top-1 z-[60] flex h-10 w-10 items-center justify-center rounded-none !border-0 bg-transparent p-0 text-slate-700 !shadow-none outline-none backdrop-blur-none dark:bg-transparent dark:text-slate-100 lg:hidden"
          aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
          title={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <aside
          className={`panel-bleed fixed inset-x-0 top-0 z-[50] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-b-2xl border-0 border-b border-white/10 bg-[var(--surface-bg)] shadow-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out lg:hidden ${
            mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-90'
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
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`edge-toggle fixed top-0 z-[60] hidden h-11 w-11 items-center justify-center rounded-none border-0 bg-transparent p-0 text-slate-100/80 shadow-none ring-0 transition-[left] duration-300 lg:flex ${collapsed ? 'left-5' : 'left-[164px]'}`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Menu className="w-4 h-4" />
      </button>

      <aside
        className={`panel-bleed sticky top-0 z-[50] hidden h-[100dvh] shrink-0 flex-col ${collapsed ? 'w-16' : 'w-52'} overflow-hidden rounded-none border-0 bg-[var(--surface-bg)] ring-0 transition-[width,box-shadow] duration-300 ease-out lg:flex`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}