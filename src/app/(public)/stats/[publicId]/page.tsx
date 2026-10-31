'use client'

import { use, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { formatNumber } from '@/lib/utils/helpers'
import { getCountryLabel } from '@/lib/utils/country'
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile'
import { Chart } from '@/components/ui/Chart'
import { CountryFlag } from '@/components/ui/CountryFlag'
import { BrowserLogo } from '@/components/ui/BrowserLogo'
import Image from 'next/image'
import {
  Eye,
  MousePointerClick,
  Users,
  Globe2,
  DollarSign,
  CreditCard,
  CheckCircle,
  Check,
  ExternalLink,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  ChevronDown,
  Activity,
  Shield,
  Download,
  RefreshCw,
  MapPin,
  Hash,
  Laptop,
  Computer,
  Link2,
  FileText,
  Globe,
  MousePointer,
  ArrowRight,
  X,
  Sun,
  Moon,
} from 'lucide-react'

// Types
interface Stats {
  accountName?: string
  totalClicks: number
  uniqueClicks: number
  botClicks: number
  clickRate?: number
  payoutMethod?: string | null
  unpaidEarning?: number
  geoSummary: Array<{
    country: string
    totalClicks: number
    uniqueClicks: number
  }>
  clickTrend?: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      fill: boolean
      tension: number
      pointRadius: number
    }>
  }
  clicks: Array<{
    id: string
    timestamp: string
    country: string
    region: string | null
    city: string | null
    isp: string | null
    browser: string
    browserVersion: string | null
    os: string | null
    deviceType: string | null
    deviceBrand: string | null
    userAgent: string | null
    ipAddress: string
    referrer: string | null
    isUnique: boolean
    isBot: boolean
    createdAt: string
  }>
}

function AppleDeviceIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function getReferrerLabel(referrer: string) {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return referrer
  }
}

// Metric Card
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)

const formatTaka = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)

const MetricCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color = '#34D399',
  percentage,
  percentageColor = '#34D399',
  isDark = true,
  showIcon = true,
  children,
}: any) => (
  <div className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${
    isDark
    ? 'bg-gradient-to-br from-white/[0.07] to-white/[0.025] backdrop-blur-sm border-white/10 hover:border-emerald-400/30 hover:from-white/[0.09] hover:to-white/[0.04]'
    : 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200 hover:border-emerald-300 hover:from-white hover:to-emerald-50/40'
  }`}>
    <div className="flex items-center justify-between gap-2">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
        isDark ? 'text-white/50' : 'text-slate-500'
      }`}>{label}</p>
      {showIcon && (
        <div className="shrink-0 rounded-lg p-1.5" style={{
          backgroundColor: `${color}18`,
          color,
        }}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
    </div>

    <div className="mt-1.5 flex min-w-0 items-end justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className={`text-[28px] font-bold leading-none tracking-tight tabular-nums sm:text-[32px] ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>{value}</p>
        {(subtitle || percentage !== undefined) && (
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
            {subtitle && <p className={`truncate text-xs leading-tight sm:text-[13px] ${isDark ? 'text-white/55' : 'text-slate-500'}`}>{subtitle}</p>}
            {percentage !== undefined && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums" style={{
                color: percentageColor,
                backgroundColor: `${percentageColor}18`,
              }}>
                {percentage.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>

    {children && (
      <div className={`mt-2 border-t pt-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        {children}
      </div>
    )}
  </div>
)

// Country Bar
const CountryBar = ({ country, clicks, totalClicks, max, isDark = true }: any) => {
  const percentage = max > 0 ? (clicks / max) * 100 : 0
  const share = totalClicks > 0 ? ((clicks / totalClicks) * 100).toFixed(1) : '0.0'
  return (
    <div className="flex items-center gap-3 group">
      <CountryFlag country={country} className="h-4 w-6" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm truncate ${isDark ? 'text-white/75' : 'text-slate-700'}`}>
            {getCountryLabel(country)}
          </span>
          <span className={`text-xs font-medium tabular-nums flex items-center gap-2 ${
            isDark ? 'text-white/50' : 'text-slate-600'
          }`}>
            <span>{formatNumber(clicks)}</span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              isDark
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {share}%
            </span>
          </span>
        </div>
        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
          isDark ? 'bg-white/5' : 'bg-slate-200'
        }`}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out will-change-transform"
            style={{
              width: `${percentage}%`,
              background: isDark
                ? 'linear-gradient(90deg, #34D399, #10B981)'
                : 'linear-gradient(90deg, #059669, #047857)',
              transform: 'translateZ(0)'
            }}
          />
        </div>
      </div>
    </div>
  )
}

const ClickStatusIcon = ({ isUnique, isDark = true }: { isUnique: boolean; isDark?: boolean }) => {
  const Icon = isUnique ? Check : X
  const label = isUnique ? 'Unique click' : 'Repeat click'

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        isUnique
          ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
          : (isDark ? 'text-amber-300' : 'text-amber-700')
      }`}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </span>
  )
}

// Skeleton Loader
const SkeletonLoader = ({ isDark = true }: { isDark?: boolean }) => (
  <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'}`}>
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-200'} animate-pulse`} />
          <div>
            <div className={`h-5 w-40 ${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded animate-pulse`} />
            <div className={`h-3 w-28 ${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded mt-1 animate-pulse`} />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-9 w-16 ${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded-lg animate-pulse`} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded-xl p-5 animate-pulse`}>
            <div className={`h-3 w-20 ${isDark ? 'bg-white/10' : 'bg-gray-300'} rounded mb-3`} />
            <div className={`h-7 w-28 ${isDark ? 'bg-white/10' : 'bg-gray-300'} rounded`} />
          </div>
        ))}
      </div>
      <div className={`${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded-xl p-5 mb-6`}>
        <div className={`h-[180px] w-full ${isDark ? 'bg-white/10' : 'bg-gray-300'} rounded animate-pulse`} />
      </div>
      <div className={`${isDark ? 'bg-white/5' : 'bg-gray-200'} rounded-xl overflow-hidden`}>
        <div className="p-4 border-b border-white/5">
          <div className={`h-4 w-32 ${isDark ? 'bg-white/10' : 'bg-gray-300'} rounded animate-pulse`} />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-10 w-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded animate-pulse`} />
          ))}
        </div>
      </div>
    </div>
  </div>
)

// Main Component
export default function PublicStatsPage({ params }: { params: Promise<{ publicId: string }> }) {
  const resolvedParams = use(params)
  const publicId = resolvedParams.publicId

  const [isDark, setIsDark] = useState(true)
  const [themeLoaded, setThemeLoaded] = useState(false)
  const originalDarkClass = useRef<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light') setIsDark(false)
    else if (stored === 'dark') setIsDark(true)
    else setIsDark(true)
    setThemeLoaded(true)
  }, [])

  useEffect(() => {
    if (themeLoaded) localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark, themeLoaded])

  useEffect(() => {
    if (!themeLoaded) return

    const root = document.documentElement
    if (originalDarkClass.current === null) {
      originalDarkClass.current = root.classList.contains('dark')
    }
    root.classList.toggle('dark', isDark)

    return () => {
      root.classList.toggle('dark', originalDarkClass.current === true)
    }
  }, [isDark, themeLoaded])

  const toggleTheme = () => setIsDark(!isDark)

  const [stats, setStats] = useState<Stats | null>(null)
  const [accountName, setAccountName] = useState('Afficix')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState('US')
  const [filterUnique, setFilterUnique] = useState<'all' | 'unique' | 'repeat'>('unique')
  const [earningCurrency, setEarningCurrency] = useState<'USD' | 'BDT'>('BDT')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [showGeoInfo, setShowGeoInfo] = useState<string | null>(null)
  const [showDeviceInfo, setShowDeviceInfo] = useState<string | null>(null)
  const [showBrowserVersion, setShowBrowserVersion] = useState<string | null>(null)
  const [showPaymentMethodPrompt, setShowPaymentMethodPrompt] = useState(false)
  const paymentPromptShown = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch data
  useEffect(() => {
    const abortController = new AbortController()

    const fetchStats = async () => {
      try {
        setIsRefreshing(true)
        const response = await fetch(
          `/api/analytics/public/${publicId}?search=${encodeURIComponent(search)}&country=${encodeURIComponent(filterCountry)}&unique=${encodeURIComponent(filterUnique)}&referrer=all&range=30d&limit=10000`,
          {
            signal: abortController.signal,
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        )
        if (!response.ok) throw new Error('Dashboard not found')
        const data = await response.json()
        setStats(data)
        setAccountName(data.accountName || 'Afficix')
        if (!paymentPromptShown.current && !data.payoutMethod) {
          paymentPromptShown.current = true
          setShowPaymentMethodPrompt(true)
        }
        setError('')
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchStats()
    return () => abortController.abort()
  }, [publicId, search, filterCountry, filterUnique, refreshKey])

  const getDeviceIcon = useCallback((deviceType: string | null, deviceBrand: string | null) => {
    const type = deviceType?.toLowerCase() || ''
    const brand = deviceBrand?.toLowerCase() || ''
    if (brand.includes('iphone')) return AppleDeviceIcon
    if (brand.includes('ipad') || type.includes('tablet')) return Tablet
    if (brand.includes('iphone') || type.includes('mobile') || type.includes('phone')) return Smartphone
    if (type.includes('laptop') || type.includes('macbook')) return Laptop
    if (isDesktopDeviceType(deviceType) || brand.includes('mac')) return Computer
    return Monitor
  }, [])

  const getDeviceLabel = useCallback((click: Stats['clicks'][number]) => {
    const brand = click.deviceBrand || ''
    const os = click.os || ''
    const type = click.deviceType || ''
    let parts = []
    if (brand) parts.push(brand)
    if (type && !brand.toLowerCase().includes(type.toLowerCase())) parts.push(type)
    if (os && !parts.some(p => p.toLowerCase().includes(os.toLowerCase()))) parts.push(os)
    return parts.length > 0 ? parts.join(' • ') : 'Unknown Device'
  }, [])

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  // Deduplicate clicks by ID
  const dedupedClicks = useMemo(() => {
    const clicks = stats?.clicks ?? []
    const map = new Map<string, typeof clicks[number]>()
    clicks.forEach(click => {
      if (!map.has(click.id)) map.set(click.id, click)
    })
    return Array.from(map.values())
  }, [stats?.clicks])

  // Keep the public dashboard aligned with actual click logs: all non-bot clicks are visible.
  const filteredClicks = useMemo(() => {
    return dedupedClicks.filter(click => !click.isBot)
  }, [dedupedClicks])

  const downloadCsv = useCallback(() => {
    if (!stats || filteredClicks.length === 0) return

    const escapeField = (field: unknown) => {
      if (field == null) return ''
      if (typeof field === 'number' || typeof field === 'boolean') return String(field)
      const str = String(field)
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const data = filteredClicks.map(click => ({
      Timestamp: click.timestamp,
      Country: click.country,
      Region: click.region ? decodeURIComponent(click.region) : click.region,
      City: click.city ? decodeURIComponent(click.city) : click.city,
      ISP: click.isp,
      Browser: click.browser,
      'Browser Version': click.browserVersion,
      OS: click.os,
      'Device Type': click.deviceType,
      'Device Brand': click.deviceBrand,
      Unique: click.isUnique ? 1 : 0,
      Bot: click.isBot ? 1 : 0,
      Referrer: click.referrer,
      'IP Address': click.ipAddress,
    }))

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map((header) => escapeField((row as Record<string, unknown>)[header]))
          .join(',')
      ),
    ]

    const csvString = csvRows.join('\r\n')
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `afficix-stats-${publicId}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredClicks, publicId, stats])

  // Recompute all statistics from filtered clicks
  const computedStats = useMemo(() => {
    const totalClicks = filteredClicks.length
    const uniqueClicks = filteredClicks.filter(c => c.isUnique).length
    const botClicks = filteredClicks.filter(c => c.isBot).length

    const countryMap = new Map<string, { total: number; unique: number }>()
    filteredClicks.forEach(click => {
      const country = click.country || 'Unknown'
      if (!countryMap.has(country)) {
        countryMap.set(country, { total: 0, unique: 0 })
      }
      const entry = countryMap.get(country)!
      entry.total += 1
      if (click.isUnique) entry.unique += 1
    })
    const geoSummary = Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        totalClicks: data.total,
        uniqueClicks: data.unique,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks)

    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - 30)

    const inRange = filteredClicks.filter(click => {
      const date = new Date(click.timestamp)
      return date >= cutoffDate && date <= now
    })

    const dateMap = new Map<string, number>()
    inRange.forEach(click => {
      const date = new Date(click.timestamp)
      const key = date.toISOString().slice(0, 10)
      dateMap.set(key, (dateMap.get(key) || 0) + 1)
    })

    const labels: string[] = []
    const data: number[] = []
    const current = new Date(cutoffDate)
    const chartDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    while (current <= now) {
      const key = current.toISOString().slice(0, 10)
      labels.push(chartDateFormatter.format(current))
      data.push(dateMap.get(key) || 0)
      current.setDate(current.getDate() + 1)
    }

    const clickTrend = {
      labels,
      datasets: [{
        label: 'Clicks',
        data,
        borderColor: isDark ? '#34D399' : '#059669',
        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: isDark ? '#34D399' : '#059669',
        borderWidth: 2,
      }],
    }

    return { totalClicks, uniqueClicks, botClicks, geoSummary, clickTrend }
  }, [filteredClicks, isDark])

  const geoSummary = stats?.geoSummary ?? computedStats.geoSummary
  const countries = geoSummary.map(e => e.country).filter(Boolean)
  const geoTotalUniqueClicks = geoSummary.reduce((total, country) => total + country.uniqueClicks, 0)

  const allCountries = useMemo(() => {
    return Array.from(new Set(countries))
  }, [countries])

  const totalClicks = computedStats.totalClicks
  const uniqueClicks = computedStats.uniqueClicks
  const botClicks = computedStats.botClicks
  const clickRate = Number(stats?.clickRate ?? 0) || 0
  const usaUniqueClicks = filteredClicks.filter((click) => click.country === 'US' && click.isUnique).length
  const earning = usaUniqueClicks * clickRate
  const unpaidEarning = Number(stats?.unpaidEarning ?? 0) || 0
  const uniqueRate = totalClicks ? ((uniqueClicks / totalClicks) * 100) : 0
  const botRate = totalClicks ? ((botClicks / totalClicks) * 100) : 0
  const maxCountryUniqueClicks = geoSummary.length
    ? Math.max(...geoSummary.map(c => c.uniqueClicks))
    : 0

  const chartData = useMemo(() => ({
    labels: computedStats.clickTrend.labels,
    datasets: computedStats.clickTrend.datasets,
  }), [computedStats.clickTrend])

  if (!themeLoaded) return <div className="min-h-screen bg-slate-950" />
  if (loading) return <SkeletonLoader isDark={isDark} />

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'}`}>
        <div className="text-center max-w-md px-4">
          <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <Shield className={`h-8 w-8 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} strokeWidth={1.5} />
          </div>
          <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Unable to Load Dashboard</h1>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/40' : 'text-slate-600'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const selectedCountryLabel = filterCountry ? getCountryLabel(filterCountry) : ''

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DataDashboard',
            name: accountName || 'Public Analytics',
            description: `Real-time analytics with ${totalClicks} total clicks and ${uniqueClicks} unique visitors`,
            url: `https://afficix.com/stats/${publicId}`,
            provider: {
              '@type': 'Organization',
              name: 'Afficix',
              url: 'https://afficix.com',
              logo: 'https://afficix.com/afficixlogo.png',
            },
            dateModified: new Date().toISOString(),
            identifier: publicId,
            mainEntity: {
              '@type': 'WebPage',
              name: 'Public Analytics Dashboard',
              description: 'Track clicks, visitors, and geographic data in real-time',
            },
          }),
        }}
      />

      <div className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'
      }`}>
        <div className="mx-auto w-full max-w-[1920px] px-3 py-4 sm:px-5 sm:py-6 xl:px-7">

          {/* Header */}
          <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 pr-[88px] sm:gap-4 sm:pr-0">
              <div className="relative h-11 w-32 shrink-0 overflow-hidden rounded-2xl border border-transparent bg-transparent sm:h-[54px] sm:w-36">
                <Image
                  src="/afficixlogo.png"
                  alt="Afficix logo"
                  width={1275}
                  height={482}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`inline-flex min-w-0 max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium tracking-tight ${
                  isDark
                    ? 'border-white/10 bg-white/[0.04] text-white/75'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}>
                  <span className="truncate">
                    {accountName && accountName !== 'Afficix' ? accountName : 'Public Analytics'}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">
              <a
                href={`/payment/${publicId}`}
                aria-label="Wallet and payment settings"
                title="Wallet and payment settings"
                className={`group flex min-h-10 w-fit min-w-0 items-center justify-between justify-self-start gap-2 rounded-xl border px-2 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 sm:min-h-11 sm:w-auto sm:justify-self-auto sm:gap-3 sm:px-3.5 ${
                  isDark
                    ? 'border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07] focus:ring-offset-slate-950'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 focus:ring-offset-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isDark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <CreditCard className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  {unpaidEarning <= 0 && (
                    <span className={`hidden truncate text-xs font-semibold sm:inline ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                      Wallet
                    </span>
                  )}
                  {unpaidEarning > 0 && (
                    <span className={`whitespace-nowrap text-xs font-semibold tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {earningCurrency === 'USD'
                        ? formatCurrency(unpaidEarning)
                        : (
                          <>
                            <span className="align-baseline text-[0.78em] font-bold">৳</span>{' '}
                            {formatTaka(unpaidEarning * 118)}
                          </>
                        )}
                    </span>
                  )}
                </div>
                <span className="hidden shrink-0 items-center sm:flex">
                  <ArrowRight className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${isDark ? 'text-white/35' : 'text-slate-400'}`} aria-hidden="true" />
                </span>
              </a>
              <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => {
                    setRefreshKey((current) => current + 1)
                    setIsRefreshing(true)
                  }}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:h-9 sm:w-9 ${
                    isDark ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/70' : 'bg-white border-gray-200 text-slate-700 hover:text-slate-900'
                  }`}
                  aria-label="Refresh analytics"
                  title="Refresh analytics"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                </button>
                <button
                  onClick={downloadCsv}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:h-9 sm:w-9 ${
                    isDark ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/70' : 'bg-white border-gray-200 text-slate-700 hover:text-slate-900'
                  }`}
                  aria-label="Download click data"
                  title="Download CSV"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={toggleTheme}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:h-9 sm:w-9 ${
                    isDark ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/70' : 'bg-white border-gray-200 text-slate-700 hover:text-slate-900'
                  }`}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div className={`absolute right-0 top-2 z-10 flex shrink-0 rounded-lg border p-0.5 text-[10px] font-semibold sm:static sm:z-auto ${
              isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'
            }`}>
              {(['BDT', 'USD'] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setEarningCurrency(currency)}
                  aria-pressed={earningCurrency === currency}
                  className={`rounded-md px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
                    earningCurrency === currency
                      ? 'bg-emerald-500 text-slate-950'
                      : (isDark ? 'text-white/45 hover:text-white/75' : 'text-gray-500 hover:text-gray-800')
                  }`}
                  aria-label={`Show earning in ${currency}`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <MetricCard
              icon={MousePointerClick}
              label="TCL"
              value={formatNumber(totalClicks)}
              color="#34D399"
              subtitle="All traffic"
              isDark={isDark}
            />
            <MetricCard
              icon={Users}
              label="UCL"
              value={formatNumber(uniqueClicks)}
              color="#38BDF8"
              percentage={uniqueRate}
              percentageColor="#34D399"
              isDark={isDark}
            />
            <MetricCard
              icon={Globe2}
              label="GEO"
              value={countries.length || 0}
              color="#F472B6"
              subtitle="Tracked"
              isDark={isDark}
            />
            <MetricCard
              icon={DollarSign}
              label="Earning"
              value={earningCurrency === 'USD' ? formatCurrency(earning) : (
                <>
                  <span className="align-baseline text-[0.78em] font-extrabold">৳</span>{' '}
                  {formatTaka(earning * 118)}
                </>
              )}
              color="#34D399"
              subtitle={(
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlag country="US" className="h-3 w-[18px]" />
                  {formatNumber(usaUniqueClicks)} clicks
                </span>
              )}
              isDark={isDark}
            />
          </div>

          {/* Chart & Geography */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
            <div className={`min-w-0 overflow-hidden rounded-xl border p-3 shadow-sm sm:rounded-2xl sm:p-4 lg:col-span-2 ${
              isDark ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200 bg-white'
            }`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-400" strokeWidth={1.75} aria-hidden="true" />
                  <span className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Click activity</span>
                </div>
                <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Last 30 days</span>
              </div>
              <div className="h-[220px] w-full min-w-0 overflow-hidden">
                <Chart
                  data={chartData}
                  height={220}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)', drawBorder: false },
                        border: { display: false },
                        ticks: { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(71,85,105,0.8)', font: { size: 10 }, maxTicksLimit: 4, padding: 8 },
                      },
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(71,85,105,0.8)',
                          font: { size: 10 },
                          autoSkip: true,
                          maxTicksLimit: 5,
                          maxRotation: 0,
                          minRotation: 0,
                        },
                      },
                    },
                    interaction: { intersect: false, mode: 'index' },
                  }}
                />
              </div>
            </div>

            <div className={`rounded-xl border p-3 shadow-sm sm:rounded-2xl sm:p-5 ${
              isDark ? 'bg-white/[0.045] backdrop-blur-sm border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="mb-3 flex items-center">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Top Countries</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {geoSummary.slice(0, 5).map((country) => (
                  <CountryBar
                    key={country.country}
                    country={country.country}
                    clicks={country.uniqueClicks}
                    totalClicks={geoTotalUniqueClicks}
                    max={maxCountryUniqueClicks}
                    isDark={isDark}
                  />
                ))}
                {geoSummary.length === 0 && (
                  <div className="text-center py-6">
                    <Globe2 className={`h-7 w-7 mx-auto mb-2 ${isDark ? 'text-white/10' : 'text-gray-300'}`} strokeWidth={1.5} />
                    <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>No geographic data yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-2 sm:rounded-2xl sm:p-3 ${
            isDark ? 'bg-white/[0.035] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`flex basis-full items-center gap-2 rounded-lg border px-3 py-2 sm:min-w-[200px] sm:flex-1 sm:basis-auto sm:rounded-xl ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
            }`}>
              <Search className={`h-3.5 w-3.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`} strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search click logs"
                className={`w-full border-none bg-transparent text-sm outline-none focus:ring-0 ${
                  isDark ? 'text-white placeholder:text-white/20' : 'text-slate-900 placeholder:text-slate-400'
                }`}
                placeholder="Search by IP, country, browser..."
              />
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <button
                onClick={() => { setFilterCountry(''); setFilterUnique('all'); }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  filterCountry === '' && filterUnique === 'all'
                    ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                    : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                All
              </button>

              <button
                onClick={() => setFilterUnique(filterUnique === 'unique' ? 'all' : 'unique')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  filterUnique === 'unique'
                    ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                    : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                <Users className="h-3 w-3" />
                Unique
              </button>

              <button
                onClick={() => setFilterUnique(filterUnique === 'repeat' ? 'all' : 'repeat')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  filterUnique === 'repeat'
                    ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                    : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                Repeat
              </button>

              {/* Always show USA as the first country button */}
              {(() => {
                const isSelected = filterCountry === 'US'
                return (
                  <button
                    key="US"
                    onClick={() => setFilterCountry(isSelected ? '' : 'US')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      isSelected
                        ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                        : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                    }`}
                  >
                    <CountryFlag country="US" className="h-3 w-[18px]" />
                    <span>{usaUniqueClicks}</span>
                  </button>
                )
              })()}

              {/* Show next 1 country from data (excluding USA if it appears) */}
              {countries.filter(c => c !== 'US').slice(0, 1).map((country) => {
                return (
                  <button
                    key={country}
                    onClick={() => setFilterCountry(filterCountry === country ? '' : country)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      filterCountry === country
                        ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                        : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                    }`}
                  >
                    <CountryFlag country={country} className="h-3 w-[18px]" />
                  </button>
                )
              })}

              {/* Show "More" dropdown if there are countries beyond USA + 1 */}
              {countries.filter(c => c !== 'US').length > 1 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                      filterCountry && !['US', ...countries.filter(c => c !== 'US').slice(0, 1)].includes(filterCountry)
                        ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                        : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-600 hover:text-gray-900')
                    }`}
                  >
                    {filterCountry && !['US', ...countries.filter(c => c !== 'US').slice(0, 1)].includes(filterCountry) ? (
                      <>
                        <CountryFlag country={filterCountry} className="h-3 w-[18px]" />
                        <span className="truncate max-w-[60px]">{selectedCountryLabel}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3" />
                        More
                      </>
                    )}
                    <ChevronDown className={`h-3 w-3 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </button>

                  {isCountryDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 w-48 max-h-60 overflow-y-auto rounded-lg border shadow-xl z-20 py-1 ${
                      isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200'
                    }`}>
                      <div className={`px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b ${
                        isDark ? 'text-white/30 border-white/5' : 'text-gray-400 border-gray-100'
                      }`}>
                        Select Country
                      </div>
                      {/* Show all countries in dropdown (including USA) */}
                      {allCountries.map((country) => {
                       const label = getCountryLabel(country)
                        const isSelected = filterCountry === country
                        const hasData = countries.includes(country)
                        return (
                          <button
                            key={country}
                            onClick={() => { setFilterCountry(country); setIsCountryDropdownOpen(false) }}
                            className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors ${
                              isSelected
                                ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-800')
                                : (isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900')
                            }`}
                          >
                            <CountryFlag country={country} className="h-3 w-[18px]" />
                            <span className="truncate">{label}</span>
                            {!hasData && (
                              <span className={`text-[9px] ml-auto ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                                (no data)
                              </span>
                            )}
                            {isSelected && <CheckCircle className={`h-3 w-3 ml-auto ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} strokeWidth={2} />}
                          </button>
                        )
                      })}
                      {filterCountry && (
                        <div className={`border-t px-2 py-1 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                          <button
                            onClick={() => { setFilterCountry(''); setIsCountryDropdownOpen(false) }}
                            className={`w-full px-2 py-1 text-[10px] rounded flex items-center gap-1 ${
                              isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <X className="h-3 w-3" />
                            Clear filter
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <span className={`text-[10px] px-2 py-1 rounded border ${
                isDark ? 'text-white/30 bg-white/5 border-white/5' : 'text-gray-600 bg-gray-50 border-gray-200'
              }`}>
                {filteredClicks.length} / {dedupedClicks.length} logs
              </span>
            </div>
          </div>

          {/* Data Table */}
          <div className={`mb-2 space-y-2 md:hidden`}>
            {filteredClicks.length > 0 ? (
              filteredClicks.map((click) => {
                const DeviceIcon = getDeviceIcon(click.deviceType, click.deviceBrand)
                const deviceLabel = getDeviceLabel(click)
                const locationDetails = [
                  click.city,
                  click.region,
                  click.isp && !['Unknown', 'Proxy Geo Header'].includes(click.isp) ? click.isp : null,
                ]
                  .filter((value): value is string => Boolean(value))
                  .map((value) => decodeURIComponent(value))
                const detailButtonClass = (isActive: boolean) =>
                  `flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? (isDark
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-emerald-50 text-emerald-700')
                      : (isDark
                        ? 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                  }`
                return (
                  <article
                    key={click.id}
                    className={`rounded-xl border p-3 shadow-sm transition-colors ${
                      isDark ? 'border-white/10 bg-white/[0.045] hover:border-white/15' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <time
                        dateTime={click.createdAt || click.timestamp}
                        title={formatDate(click.createdAt || click.timestamp)}
                        className={`min-w-0 flex-1 truncate text-xs font-medium ${isDark ? 'text-white/75' : 'text-slate-700'}`}
                      >
                        {formatDate(click.createdAt || click.timestamp)}
                      </time>
                      <button
                        type="button"
                        onClick={() => setShowGeoInfo(showGeoInfo === click.id ? null : click.id)}
                        aria-label={`Location: ${getCountryLabel(click.country)}. ${showGeoInfo === click.id ? 'Hide' : 'Show'} location details`}
                        aria-pressed={showGeoInfo === click.id}
                        title={`${getCountryLabel(click.country)} · ${showGeoInfo === click.id ? 'Hide' : 'Show'} location details`}
                        className={detailButtonClass(showGeoInfo === click.id)}
                      >
                        <CountryFlag country={click.country} className="h-3.5 w-5 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeviceInfo(showDeviceInfo === click.id ? null : click.id)}
                        aria-label={`Device: ${deviceLabel}. ${showDeviceInfo === click.id ? 'Hide' : 'Show'} device details`}
                        aria-pressed={showDeviceInfo === click.id}
                        title={`${deviceLabel} · ${showDeviceInfo === click.id ? 'Hide' : 'Show'} device details`}
                        className={detailButtonClass(showDeviceInfo === click.id)}
                      >
                        <DeviceIcon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBrowserVersion(showBrowserVersion === click.id ? null : click.id)}
                        aria-label={`Browser: ${click.browser || 'Unknown'}, ${click.browserVersion || 'version unknown'}. ${showBrowserVersion === click.id ? 'Hide' : 'Show'} browser details`}
                        aria-pressed={showBrowserVersion === click.id}
                        title={`${click.browser || 'Unknown'} · ${showBrowserVersion === click.id ? 'Hide' : 'Show'} browser details`}
                        className={detailButtonClass(showBrowserVersion === click.id)}
                      >
                        <BrowserLogo name={click.browser || 'Unknown'} />
                      </button>
                      <span
                        aria-label={click.isUnique ? 'Unique click' : 'Repeat click'}
                        title={click.isUnique ? 'Unique click' : 'Repeat click'}
                        className={`inline-flex shrink-0 items-center justify-center px-0.5 ${
                        click.isUnique
                          ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                          : (isDark ? 'text-amber-300' : 'text-amber-700')
                      }`}
                      >
                        {click.isUnique
                          ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                          : <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                      </span>
                    </div>

                    {(showGeoInfo === click.id || showDeviceInfo === click.id || showBrowserVersion === click.id) && (
                      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs ${isDark ? 'text-white/65' : 'text-slate-600'}`}>
                        {showGeoInfo === click.id && (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <CountryFlag country={click.country} />
                            <span className="min-w-0">
                              <span className={`font-medium ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{getCountryLabel(click.country)}</span>
                              {locationDetails.length > 0 && (
                                <span className="ml-1">{locationDetails.join(' · ')}</span>
                              )}
                            </span>
                          </div>
                        )}
                        {showDeviceInfo === click.id && (
                          <span>{deviceLabel}</span>
                        )}
                        {showBrowserVersion === click.id && (
                          <span>{click.browser || 'Unknown'} · {click.browserVersion || 'Version not available'}</span>
                        )}
                      </div>
                    )}

                    <div className={`mt-2.5 flex min-w-0 flex-col gap-2 border-t pt-2.5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                      <div
                        className={`flex min-w-0 items-center gap-1.5 font-mono text-xs ${isDark ? 'text-cyan-200/90' : 'text-cyan-700'}`}
                        title={`IP address: ${click.ipAddress || 'N/A'}`}
                      >
                        <Hash className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`} aria-hidden="true" />
                        <span className="truncate">{click.ipAddress || 'N/A'}</span>
                      </div>
                      <div className={`flex min-w-0 items-center gap-1.5 text-xs ${isDark ? 'text-white/65' : 'text-slate-600'}`}>
                        <Link2 className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`} aria-hidden="true" />
                        {click.referrer ? (
                          <a
                            href={click.referrer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`min-w-0 flex-1 truncate transition-colors ${isDark ? 'text-emerald-300/90 hover:text-emerald-200' : 'text-emerald-700 hover:text-emerald-900'}`}
                            aria-label={`Referrer: ${click.referrer}`}
                            title={click.referrer}
                          >
                            {getReferrerLabel(click.referrer)}
                          </a>
                        ) : (
                          <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Direct</span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className={`rounded-xl border px-4 py-8 text-center ${
                isDark ? 'border-white/10 bg-white/[0.045]' : 'border-slate-200 bg-white'
              }`}>
                <Eye className={`mx-auto h-6 w-6 ${isDark ? 'text-white/20' : 'text-gray-300'}`} strokeWidth={1.5} />
                <p className={`mt-2 text-sm ${isDark ? 'text-white/65' : 'text-slate-700'}`}>No clicks match your filters</p>
                <p className={`mt-1 text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>

          {/* Desktop click log table */}
          <div className={`hidden overflow-hidden rounded-2xl border shadow-sm md:block ${
            isDark ? 'bg-slate-900 border-white/10' : 'bg-white/90 border-slate-200'
          }`}>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${isDark ? 'bg-slate-800 border-white/10' : 'bg-gray-50 border-gray-200'} sticky top-0 z-10`}>
                  <tr>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> Time</div>
                    </th>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1"><Hash className="h-3 w-3" strokeWidth={1.5} /> IP</div>
                    </th>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.5} /> Location</div>
                    </th>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1"><Smartphone className="h-3 w-3" strokeWidth={1.5} /> Device</div>
                    </th>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>Browser</th>
                    <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider min-w-[200px] whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1"><Link2 className="h-3 w-3" strokeWidth={1.5} /> Referrer</div>
                    </th>
                    <th className={`px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/45' : 'text-gray-500'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredClicks.length > 0 ? (
                    filteredClicks.map((click) => {
                      const DeviceIcon = getDeviceIcon(click.deviceType, click.deviceBrand)
                      const deviceLabel = getDeviceLabel(click)
                      return (
                        <tr key={click.id} className={`transition-colors ${isDark ? 'bg-slate-900 hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                          <td className={`px-3 py-3 text-sm whitespace-nowrap ${isDark ? 'text-white/55' : 'text-gray-600'}`}>
                            {formatDate(click.createdAt || click.timestamp)}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-sm font-mono whitespace-nowrap ${isDark ? 'text-cyan-300/85' : 'text-cyan-700'}`}>
                              {click.ipAddress || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <CountryFlag country={click.country} className="h-3 w-[18px] flex-shrink-0" />
                              <span className={`text-base truncate max-w-[160px] ${isDark ? 'text-white/75' : 'text-gray-700'}`}>
                                {getCountryLabel(click.country)}
                              </span>
                              {click.city && <span className={`text-[10px] hidden md:inline ${isDark ? 'text-white/30' : 'text-gray-400'}`}>• {decodeURIComponent(click.city)}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className={`flex items-center gap-2 text-base ${isDark ? 'text-white/75' : 'text-gray-700'}`}>
                              <DeviceIcon className={`h-4 w-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`} strokeWidth={1.5} />
                              <span className="truncate max-w-[180px]" title={deviceLabel}>{deviceLabel}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-3 text-sm max-w-[160px] ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                            <div className="flex min-w-0 items-center gap-2" title={`${click.browser || 'Unknown'}${click.browserVersion ? ` v${click.browserVersion}` : ''}`}>
                              <BrowserLogo name={click.browser || 'Unknown'} />
                              <span className="truncate">
                                {click.browser || 'Unknown'}
                                {click.browserVersion && <span className={`ml-1 text-[10px] ${isDark ? 'text-white/35' : 'text-gray-400'}`}>v{click.browserVersion}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {click.referrer ? (
                              <div className="flex items-center gap-1.5 group/referrer">
                                <ExternalLink className={`h-3 w-3 flex-shrink-0 transition-colors ${isDark ? 'text-white/20 group-hover/referrer:text-emerald-400' : 'text-gray-400 group-hover/referrer:text-emerald-700'}`} strokeWidth={1.5} />
                                <a href={click.referrer} target="_blank" rel="noopener noreferrer"
                                                  className={`break-all text-sm transition-colors ${isDark ? 'text-emerald-300/90 hover:text-emerald-200' : 'text-emerald-700 hover:text-emerald-900'}`}
                                  title={click.referrer}>
                                  {click.referrer}
                                </a>
                              </div>
                            ) : (
                              <span className={`flex items-center gap-1.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
                                Direct
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center">
                              <ClickStatusIcon isUnique={click.isUnique} isDark={isDark} />
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Eye className={`h-7 w-7 ${isDark ? 'text-white/10' : 'text-gray-300'}`} strokeWidth={1.5} />
                          <p className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-500'}`}>No clicks match your filters</p>
                          <p className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-400'}`}>Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredClicks.length > 0 && (
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-3 py-2.5 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <div className={`text-xs flex items-center gap-4 flex-wrap ${isDark ? 'text-white/30' : 'text-gray-600'}`}>
                  <span>Total: {filteredClicks.length} clicks</span>
                  <span>•</span>
                  <span>Unique: {filteredClicks.filter(c => c.isUnique).length}</span>
                  <span>•</span>
                  <span>Bots: {filteredClicks.filter(c => c.isBot).length}</span>
                </div>
                <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                  <FileText className="h-3 w-3" strokeWidth={1.5} />
                  <span>All logs displayed</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer removed */}

        </div>
      </div>

      {showPaymentMethodPrompt && (
        <div className="payment-reminder-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4" role="dialog" aria-modal="true" aria-labelledby="payment-method-prompt-title" aria-describedby="payment-method-prompt-description" onClick={(event) => { if (event.target === event.currentTarget) setShowPaymentMethodPrompt(false) }}>
          <div className={`payment-reminder-panel w-full max-w-sm rounded-xl border border-t-2 p-5 shadow-lg ${isDark ? 'border-white/10 border-t-emerald-400/70 bg-slate-900 text-white' : 'border-slate-200 border-t-emerald-600 bg-white text-slate-900'}`}>
            <div className="flex items-start gap-4">
              <div className={`payment-reminder-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDark ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>Payout setup</p>
                <h2 id="payment-method-prompt-title" className="text-base font-semibold">A quick payout reminder</h2>
              </div>
              <button type="button" onClick={() => setShowPaymentMethodPrompt(false)} className={`rounded p-1.5 ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`} aria-label="Close payout reminder">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p id="payment-method-prompt-description" className={`mt-4 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Add your payment details whenever you are ready, so your earnings know where to go.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowPaymentMethodPrompt(false)} className={`payment-reminder-secondary rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
                Maybe later
              </button>
              <a href={`/payment/${publicId}`} className="payment-reminder-action inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-slate-900">
                Add payment details
                <ArrowRight className="payment-reminder-arrow h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}