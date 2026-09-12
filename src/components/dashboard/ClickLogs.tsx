'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCountryFlag, getCountryLabel } from '@/lib/utils/country'
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle,
  XCircle,
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

interface ClickLogsProps {
  filter: string
}

export default function ClickLogs({ filter }: ClickLogsProps) {
  const router = useRouter()
  const [clicks, setClicks] = useState<Click[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showBrowserVersion, setShowBrowserVersion] = useState<string | null>(null)
  const [showDeviceInfo, setShowDeviceInfo] = useState<string | null>(null)
  const [showGeoInfo, setShowGeoInfo] = useState<string | null>(null)

  const limit = 100

  const fetchClicks = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })

      const response = await fetch(`/api/analytics/clicks?${params}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setClicks(data.clicks || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch clicks:', error)
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => {
    fetchClicks(true)
  }, [fetchClicks])

  const getDeviceIcon = (deviceType: string | null) => {
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

  const getLocationSummary = (click: Click) => {
    const countryLabel = getCountryLabel(click.country)
    const decodedCity = click.city ? decodeURIComponent(click.city) : null
    const decodedRegion = click.region ? decodeURIComponent(click.region) : null
    const locationText = [decodedCity, decodedRegion].filter(Boolean).join(', ')
    const ispText = click.isp?.trim() && click.isp !== 'Unknown' && click.isp !== 'Proxy Geo Header' ? click.isp.trim() : null
    if (showGeoInfo === click.id) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5"><span>{getCountryFlag(click.country)}</span><span className="font-medium text-white/80">{countryLabel}</span></div>
          {(locationText || ispText) && <div className="text-[11px] text-white/25">{locationText}{locationText && ispText ? ` • ${ispText}` : ispText}</div>}
        </div>
      )
    }
    return <span>{getCountryFlag(click.country)}</span>
  }

  if (loading) {
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
        <Activity className="h-4 w-4 text-indigo-400" strokeWidth={1.5} />
        <span className="text-sm font-medium text-white/70">Click Activity</span>
      </div>
      <div className="hidden" aria-hidden="true">
        {clicks.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <MousePointerClick className="h-7 w-7 text-white/10" strokeWidth={1.5} />
            <p className="text-sm text-white/30">No clicks match your filters</p>
            <p className="text-xs text-white/20">
              Share a link and the first clicks will appear here with campaign, device, and location insights.
            </p>
          </div>
        ) : (
          clicks.map((click) => {
            return (
              <div
                key={click.id}
                className={`rounded-lg bg-slate-950/70 p-2 shadow-sm ${click.isUnique ? '' : 'bg-amber-500/5'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[0.24em] text-slate-500">Time</div>
                    <div className="flex flex-col gap-0">
                      {(() => {
                        const { date, time } = formatDateTwoLines(click.createdAt)
                        return (
                          <>
                            <div className="text-[11px] font-semibold text-emerald-400">{date}</div>
                            <div className="text-[9px] text-slate-400">{time}</div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="shrink-0 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] uppercase tracking-[0.24em] text-slate-300">
                      {click.isUnique ? 'Unique' : 'Dup'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 space-y-0 divide-y divide-slate-800 text-xs text-slate-300">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">IP:</span>
                    <span className="font-medium text-slate-100">{click.ipAddress}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Campaign:</span>
                    <span className="truncate text-cyan-300">{click.linkAccount.slug}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Device:</span>
                    <button onClick={() => setShowDeviceInfo(showDeviceInfo === click.id ? null : click.id)} className="truncate text-slate-300 hover:text-slate-200 cursor-pointer transition" title="More details">
                      {getDeviceLabel(click)}
                    </button>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Browser:</span>
                    <button onClick={() => setShowBrowserVersion(showBrowserVersion === click.id ? null : click.id)} className="text-violet-300 hover:text-violet-200 cursor-pointer transition" title="More details">
                      {showBrowserVersion === click.id ? getBrowserVersion(click) : getBrowserLabel(click)}
                    </button>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Referrer:</span>
                    <span className="max-w-[75%] break-all text-right text-slate-400">
                      {click.referrer || 'Direct'}
                    </span>
                  </div>
                  <button onClick={() => setShowGeoInfo(showGeoInfo === click.id ? null : click.id)} className="flex justify-between w-full text-slate-300 hover:text-slate-200 cursor-pointer transition py-1.5" title="More details">
                    <span className="text-slate-500">Location:</span>
                    <span className="flex items-center gap-1">
                      {getCountryFlag(click.country)}
                      {showGeoInfo === click.id && <span className="text-white/80">{getCountryLabel(click.country)}</span>}
                    </span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className={`${clicks.length > 0 ? 'w-full min-w-[980px] table-auto' : 'w-full table-fixed'}`}>
          <thead className={`${clicks.length === 0 ? 'hidden lg:table-header-group' : ''} bg-slate-950/70`}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Campaign</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Location</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Device</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Browser</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Referrer</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">IP Address</th>
              <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-slate-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {clicks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <MousePointerClick className="h-7 w-7 text-white/10" strokeWidth={1.5} />
                    <p className="text-sm text-white/30">No clicks match your filters</p>
                    <p className="text-xs text-white/20">
                      Share a link and the first clicks will appear here with campaign, device, and location insights.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              clicks.map((click, index) => (
                <tr
                  key={click.id}
                  className={`transition-all duration-200 ${click.isUnique ? 'hover:bg-slate-800/60' : 'bg-amber-500/5 hover:bg-amber-500/10'}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-4 py-2 text-sm text-slate-300">
                    <div className="flex flex-col gap-0">
                      <span className="font-medium text-cyan-300">{click.linkAccount.accountName}</span>
                      <span className="text-[11px] text-slate-500">/{click.linkAccount.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-300">
                    <button onClick={() => setShowGeoInfo(showGeoInfo === click.id ? null : click.id)} className="hover:opacity-70 cursor-pointer transition" title="Click to see geo details">
                      {getLocationSummary(click)}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-300">
                    <button onClick={() => setShowDeviceInfo(showDeviceInfo === click.id ? null : click.id)} className="flex items-center gap-1 hover:text-slate-200 cursor-pointer transition" title="Click for more details">
                      {getDeviceIcon(click.deviceType)}
                      <span className="truncate max-w-[140px]">{getDeviceLabel(click)}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-300">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setShowBrowserVersion(showBrowserVersion === click.id ? null : click.id)} className="truncate max-w-[140px] text-violet-300 hover:text-violet-200 cursor-pointer transition" title="Click to see version">
                        {showBrowserVersion === click.id ? getBrowserVersion(click) : getBrowserLabel(click)}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-cyan-200">
                    {click.referrer ? (() => {
                      const referrerInfo = getReferrerInfo(click.referrer)
                      return (
                        <a
                          href={referrerInfo.href || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:underline transition"
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
                      <span className="text-slate-500">Direct</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-slate-400">{click.ipAddress}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      {click.isUnique ? (
                        <span className="badge badge-success flex items-center gap-1 whitespace-nowrap" title="Unique click">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[10px]">Unique</span>
                        </span>
                      ) : (
                        <span className="badge badge-warning flex items-center gap-1 whitespace-nowrap" title="Repeat click">
                          <XCircle className="w-3 h-3" />
                          <span className="text-[10px]">Repeat</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-300">
                    <div className="flex flex-col items-start gap-0">
                      {(() => {
                        const { date, time } = formatDateTwoLines(click.createdAt)
                        return (
                          <>
                            <div className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-slate-500" />
                              <span>{date}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{time}</span>
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

      </div>
    </div>
  )
}