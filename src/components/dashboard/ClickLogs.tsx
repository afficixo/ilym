'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCountryLabel } from '@/lib/utils/country'
import { BrowserLogo } from '@/components/ui/BrowserLogo'
import { CountryFlag } from '@/components/ui/CountryFlag'
import {
  Monitor,
  Smartphone,
  Tablet,
  Check,
  X,
  ExternalLink,
  MousePointerClick,
  Activity,
  Clock,
} from 'lucide-react'

interface Click {
  id: string
  ipAddress: string | null
  country: string | null
  city: string | null
  region?: string | null
  isp: string | null
  referrer: string | null
  browser: string | null
  browserVersion: string | null
  os: string | null
  deviceType: string | null
  deviceBrand: string | null
  userAgent: string | null
  isUnique: boolean
  isBot: boolean
  botScore: number | null
  createdAt: string
  linkAccount: {
    accountName: string
    slug: string
  }
}

function uniqueClicks(clicks: Click[]) {
  const seenIds = new Set<string>()
  return clicks.filter((click) => {
    if (seenIds.has(click.id)) return false
    seenIds.add(click.id)
    return true
  })
}

export default function ClickLogs({ canDelete }: { canDelete: boolean }) {
  const router = useRouter()
  const [clicks, setClicks] = useState<Click[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState(2)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showBrowserVersion, setShowBrowserVersion] = useState<string | null>(null)
  const [showDeviceInfo, setShowDeviceInfo] = useState<string | null>(null)
  const [showGeoInfo, setShowGeoInfo] = useState<string | null>(null)
  const [deletingClickId, setDeletingClickId] = useState<string | null>(null)
  const [clickToDelete, setClickToDelete] = useState<Click | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const limit = 50

  const fetchPage = useCallback(async (pageNumber: number) => {
    const params = new URLSearchParams({
      page: pageNumber.toString(),
      limit: limit.toString(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    const response = await fetch(`/api/analytics/clicks?${params}`)
    if (response.status === 401) {
      router.push('/login')
      return null
    }

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch click logs.')
    }
    return data
  }, [router])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')

    fetchPage(1)
      .then((data) => {
        if (!active || !data) return
        setClicks(uniqueClicks(data.clicks || []))
        setTotal(data.total || 0)
        setNextPage(2)
        setHasMore((data.page || 1) < (data.totalPages || 1))
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error('Failed to fetch clicks:', error)
        setLoadError(error instanceof Error ? error.message : 'Failed to fetch click logs.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    setLoadError('')

    try {
      const data = await fetchPage(nextPage)
      if (!data) return
      setClicks((currentClicks) => uniqueClicks(currentClicks.concat(data.clicks || [])))
      setNextPage((data.page || nextPage) + 1)
      setHasMore((data.page || nextPage) < (data.totalPages || nextPage))
    } catch (error) {
      console.error('Failed to fetch more clicks:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch more click logs.')
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, nextPage])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    const scrollContainer = document.getElementById('main-content')
    if (!sentinel || !scrollContainer || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { root: scrollContainer, rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  useEffect(() => {
    if (!clickToDelete) return

    cancelDeleteButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingClickId) {
        setClickToDelete(null)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [clickToDelete, deletingClickId])

  const deleteClick = async () => {
    if (!canDelete || deletingClickId || !clickToDelete) return
    const click = clickToDelete

    setClickToDelete(null)
    setDeletingClickId(click.id)
    setDeleteError('')

    try {
      const response = await fetch(`/api/analytics/clicks?id=${encodeURIComponent(click.id)}`, {
        method: 'DELETE',
      })
      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete click log.')
      }

      const remainingClicks = clicks.filter((item) => item.id !== click.id)
      setClicks(remainingClicks)
      setTotal((currentTotal) => Math.max(0, currentTotal - 1))
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete click log.')
    } finally {
      setDeletingClickId(null)
    }
  }

  const getDeviceIcon = (deviceType: string | null, os: string | null, deviceBrand: string | null) => {
    const platform = `${os || ''} ${deviceBrand || ''}`.toLowerCase()
    if (
      platform.includes('ios') ||
      platform.includes('apple') ||
      platform.includes('iphone') ||
      platform.includes('ipad') ||
      platform.includes('mac')
    ) {
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
          role="img"
          aria-label="Apple logo"
        >
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
      )
    }

    if (!deviceType) return <Monitor className="w-4 h-4" />
    const device = deviceType.toLowerCase()
    if (device.includes('mobile') || device.includes('phone')) {
      return <Smartphone className="w-4 h-4" />
    }
    if (device.includes('tablet')) {
      return <Tablet className="w-4 h-4" />
    }
    return <Monitor className="w-4 h-4" />
  }

  const formatDateTwoLines = (date: string) => {
    const dateObj = new Date(date)
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return { date: dateStr, time: timeStr }
  }

  const getReferrerInfo = (referrer: string | null) => {
    if (!referrer) return { hostname: 'Direct', href: null }
    const trimmed = referrer.trim()
    if (!trimmed) return { hostname: 'Direct', href: null }
    const normalizedHref = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(normalizedHref)
      return { hostname: parsed.hostname || 'Referrer', href: parsed.toString() }
    } catch {
      return { hostname: trimmed.split('/')[0] || 'Referrer', href: null }
    }
  }

  const getBrowserLabel = (click: Click) => click.browser || 'Unknown Browser'
  const getBrowserVersion = (click: Click) => click.browserVersion || 'Version not available'
  const getDeviceLabel = (click: Click) => `${click.os || click.deviceType || 'Unknown OS'} • ${click.deviceBrand || click.deviceType || 'Unknown Device'}`

  const decodeLocationPart = (value: string | null) => {
    if (!value) return null
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const getLocationSummary = (click: Click) => {
    const countryLabel = getCountryLabel(click.country)
    const decodedCity = decodeLocationPart(click.city)
    const decodedRegion = decodeLocationPart(click.region ?? null)
    const locationText = [decodedCity, decodedRegion].filter(Boolean).join(', ')
    const ispText = click.isp?.trim() && click.isp !== 'Unknown' && click.isp !== 'Proxy Geo Header' ? click.isp.trim() : null
    if (showGeoInfo === click.id) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5"><CountryFlag country={click.country} /><span className="font-medium text-slate-800 dark:text-white/80">{countryLabel}</span></div>
          {(locationText || ispText) && <div className="text-xs text-slate-600 dark:text-slate-300">{locationText}{locationText && ispText ? ` • ${ispText}` : ispText}</div>}
        </div>
      )
    }
    return <CountryFlag country={click.country} />
  }

  if (loading && clicks.length === 0) {
    return (
      <div className="border-0 bg-transparent p-0">
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-4"><div className="w-8 h-8 skeleton rounded" /><div className="flex-1"><div className="h-4 w-48 skeleton rounded" /><div className="h-3 w-32 skeleton rounded mt-2" /></div><div className="h-3 w-20 skeleton rounded" /></div>)}</div>
      </div>
    )
  }

  return (
    <div className="border-0 bg-transparent overflow-hidden transition-colors duration-200">
      <div className="border-0 bg-transparent p-0">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--primary-700)] dark:text-[var(--primary-300)]" strokeWidth={1.5} />
        <span className="text-base font-semibold text-slate-900 dark:text-white/90">Click Activity</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {clicks.length.toLocaleString()} of {total.toLocaleString()} logs
        </span>
      </div>
      {loadError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {loadError}
        </p>
      )}
      {loadingMore && (
        <p role="status" className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Loading more click logs…
        </p>
      )}
      {deleteError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {deleteError}
        </p>
      )}
      <div className="space-y-2 lg:hidden">
        {clicks.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <MousePointerClick className="h-7 w-7 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            <p className="text-sm text-slate-600 dark:text-slate-300">No clicks match your filters</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Share a link and the first clicks will appear here with campaign, device, and location insights.
            </p>
          </div>
        ) : (
          clicks.map((click) => {
            const createdAt = new Date(click.createdAt)
            const compactTimestamp = `${createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

            return (
              <div
                key={click.id}
                className={`rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-2.5 shadow-[var(--shadow-sm)] ${click.isUnique ? '' : 'border-amber-400/40 bg-amber-50 dark:bg-amber-500/5'}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[13px] font-semibold text-slate-900 dark:text-white" title={click.linkAccount.accountName}>
                    {click.linkAccount.accountName}
                  </div>
                  <time
                    dateTime={createdAt.toISOString()}
                    title={createdAt.toLocaleString()}
                    className="shrink-0 text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400"
                  >
                    {compactTimestamp}
                  </time>
                </div>

                <div className="mt-1.5 flex items-center gap-1 border-y border-[var(--surface-border)] py-0.5">
                  <button
                    type="button"
                    onClick={() => setShowGeoInfo(showGeoInfo === click.id ? null : click.id)}
                    aria-label={`Location: ${getCountryLabel(click.country)}. ${showGeoInfo === click.id ? 'Hide' : 'Show'} location details`}
                    aria-pressed={showGeoInfo === click.id}
                    title={`Location: ${getCountryLabel(click.country)}`}
                    className="flex h-7 w-8 items-center justify-center rounded-md transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:hover:bg-white/10"
                  >
                    <CountryFlag country={click.country} className="h-3.5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeviceInfo(showDeviceInfo === click.id ? null : click.id)}
                    aria-label={`Device: ${getDeviceLabel(click)}. ${showDeviceInfo === click.id ? 'Hide' : 'Show'} device details`}
                    aria-pressed={showDeviceInfo === click.id}
                    title={`Device: ${getDeviceLabel(click)}`}
                    className="flex h-7 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {getDeviceIcon(click.deviceType, click.os, click.deviceBrand)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBrowserVersion(showBrowserVersion === click.id ? null : click.id)}
                    aria-label={`Browser: ${getBrowserLabel(click)}, ${getBrowserVersion(click)}. ${showBrowserVersion === click.id ? 'Hide' : 'Show'} browser details`}
                    aria-pressed={showBrowserVersion === click.id}
                    title={`Browser: ${getBrowserLabel(click)} · ${getBrowserVersion(click)}`}
                    className="flex h-7 w-8 items-center justify-center rounded-md transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:hover:bg-white/10"
                  >
                    <BrowserLogo name={getBrowserLabel(click)} />
                  </button>
                  <span className="ml-auto flex h-7 w-7 items-center justify-center" aria-label={click.isUnique ? 'Unique click' : 'Repeated click'} title={click.isUnique ? 'Unique click' : 'Repeated click'}>
                    {click.isUnique
                      ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
                      : <X className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                </div>
                {(showGeoInfo === click.id || showDeviceInfo === click.id || showBrowserVersion === click.id) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs text-slate-600 dark:text-slate-300">
                    {showGeoInfo === click.id && <div>{getLocationSummary(click)}</div>}
                    {showDeviceInfo === click.id && <span>{getDeviceLabel(click)}</span>}
                    {showBrowserVersion === click.id && <span>{getBrowserLabel(click)} · {getBrowserVersion(click)}</span>}
                  </div>
                )}
                <div className="mt-1 space-y-0 divide-y divide-[var(--surface-border)] text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-slate-600 dark:text-slate-300">IP:</span>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setClickToDelete(click)}
                        disabled={deletingClickId !== null}
                        className="max-w-[78%] truncate font-medium text-slate-800 underline decoration-dotted underline-offset-2 transition hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:hover:text-[#a2fa8e]"
                        aria-label={`Delete click log from ${click.ipAddress || 'unknown IP'}`}
                        title="Click the IP address to delete this click log"
                      >
                        {deletingClickId === click.id ? 'Deleting…' : click.ipAddress || 'Unknown'}
                      </button>
                    ) : (
                      <span className="max-w-[78%] truncate font-medium text-slate-800 dark:text-slate-100">{click.ipAddress || 'Unknown'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-slate-600 dark:text-slate-300">Campaign:</span>
                    <span className="truncate text-[var(--primary-700)] dark:text-[var(--primary-300)]">{click.linkAccount.slug}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2 py-1">
                    <span className="text-slate-600 dark:text-slate-300">Referrer:</span>
                    <span className="max-w-[78%] truncate text-right text-slate-600 dark:text-slate-300" title={click.referrer || 'Direct'}>
                      {click.referrer || 'Direct'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] lg:block" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className={`${clicks.length > 0 ? 'w-full min-w-[980px] table-auto' : 'w-full table-fixed'}`}>
          <thead className={`${clicks.length === 0 ? 'hidden lg:table-header-group' : ''} border-b border-[var(--surface-border)] bg-[var(--surface-elevated)]`}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Campaign</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Location</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Device</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Browser</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Referrer</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">IP Address</th>
              <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-300">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {clicks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <MousePointerClick className="h-7 w-7 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                    <p className="text-sm text-slate-600 dark:text-slate-300">No clicks match your filters</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Share a link and the first clicks will appear here with campaign, device, and location insights.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              clicks.map((click, index) => (
                <tr
                  key={click.id}
                  className={`transition-all duration-200 ${click.isUnique ? 'hover:bg-[var(--primary-50)] dark:hover:bg-[#5ff442]/10' : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/5 dark:hover:bg-amber-500/10'}`}
                  style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
                >
                  <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col gap-0">
                      <span className="font-medium text-[var(--primary-700)] dark:text-[var(--primary-300)]">{click.linkAccount.accountName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-300">/{click.linkAccount.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                    <button onClick={() => setShowGeoInfo(showGeoInfo === click.id ? null : click.id)} className="hover:opacity-70 cursor-pointer transition" title="Click to see geo details">
                      {getLocationSummary(click)}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                    <button onClick={() => setShowDeviceInfo(showDeviceInfo === click.id ? null : click.id)} className="flex items-center gap-1 hover:text-[var(--primary-700)] dark:hover:text-[var(--primary-300)] cursor-pointer transition" title="Click for more details">
                      {getDeviceIcon(click.deviceType, click.os, click.deviceBrand)}
                      <span className="truncate max-w-[140px]">{getDeviceLabel(click)}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <BrowserLogo name={getBrowserLabel(click)} />
                      <button onClick={() => setShowBrowserVersion(showBrowserVersion === click.id ? null : click.id)} className="truncate max-w-[140px] text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200 cursor-pointer transition" title="Click to see version">
                        {showBrowserVersion === click.id ? getBrowserVersion(click) : getBrowserLabel(click)}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-[var(--primary-700)] dark:text-[var(--primary-300)]">
                    {click.referrer ? (() => {
                      const referrerInfo = getReferrerInfo(click.referrer)
                      return (
                        <a
                          href={referrerInfo.href || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-500 hover:text-[var(--primary-700)] hover:underline transition dark:text-slate-400 dark:hover:text-[var(--primary-300)]"
                          title={click.referrer}
                          onClick={(event) => {
                            if (!referrerInfo.href) event.preventDefault()
                          }}
                        >
                          <span className="truncate">{referrerInfo.hostname}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      )
                    })() : (
                      <span className="text-slate-600 dark:text-slate-300">Direct</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-slate-600 dark:text-slate-400">
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setClickToDelete(click)}
                        disabled={deletingClickId !== null}
                        className="rounded-sm underline decoration-dotted underline-offset-2 transition hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-[#a2fa8e]"
                        aria-label={`Delete click log from ${click.ipAddress || 'unknown IP'}`}
                        title="Click the IP address to delete this click log"
                      >
                        {deletingClickId === click.id ? 'Deleting…' : click.ipAddress || 'Unknown'}
                      </button>
                    ) : (
                      click.ipAddress || 'Unknown'
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      {click.isUnique ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center text-emerald-400 transition-transform hover:scale-110" aria-label="Unique click" title="Unique click">
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center text-amber-400 transition-transform hover:scale-110" aria-label="Repeated click" title="Repeated click">
                          <X className="h-4 w-4" strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-start gap-0">
                      {(() => {
                        const { date, time } = formatDateTwoLines(click.createdAt)
                        return (
                          <>
                            <div className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-slate-600 dark:text-slate-300" />
                              <span>{date}</span>
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-300">{time}</span>
                          </>
                        )
                      })()}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-2 text-sm font-medium text-slate-700 shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-elevated)] disabled:cursor-wait disabled:opacity-60 dark:text-slate-200"
          >
            {loadingMore ? 'Loading…' : 'Load more click logs'}
          </button>
        </div>
      )}

      </div>
      {clickToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingClickId) setClickToDelete(null)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-click-title"
            className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#202b2f]"
          >
            <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
              <h2 id="delete-click-title" className="text-sm font-semibold text-slate-900 dark:text-white">
                Delete click log?
              </h2>
                <button
                  type="button"
                  onClick={() => setClickToDelete(null)}
                  disabled={deletingClickId !== null}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Close confirmation"
                >
                  <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mx-5 border-y border-slate-100 py-3 dark:border-white/10">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">IP address</span>
                <span className="break-all text-right font-mono text-xs font-medium text-slate-800 dark:text-slate-100">
                  {clickToDelete.ipAddress || 'Unknown IP'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Campaign</span>
                <span className="truncate text-right text-xs font-medium text-slate-800 dark:text-slate-100" title={clickToDelete.linkAccount.accountName}>
                  {clickToDelete.linkAccount.accountName}
                  <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">/{clickToDelete.linkAccount.slug}</span>
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                onClick={() => setClickToDelete(null)}
                disabled={deletingClickId !== null}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-[#263238] dark:text-slate-200 dark:hover:bg-[#303d42]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteClick}
                disabled={deletingClickId !== null}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-800 px-3.5 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}