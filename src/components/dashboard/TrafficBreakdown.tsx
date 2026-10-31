'use client'

import { Flame, Globe2, Monitor, MonitorSmartphone, Smartphone, Tablet } from 'lucide-react'
import { formatNumber } from '@/lib/utils/helpers'
import { BrowserLogo } from '@/components/ui/BrowserLogo'
import { CountryFlag } from '@/components/ui/CountryFlag'

interface BreakdownItem {
  name: string
  clicks: number
  uniqueClicks: number
}

interface TrafficBreakdownProps {
  referrerBreakdown?: BreakdownItem[]
  browserBreakdown?: BreakdownItem[]
  deviceBreakdown?: BreakdownItem[]
  countryBreakdown?: BreakdownItem[]
}

const palette = {
  countries: 'bg-sky-500',
  browsers: 'bg-violet-500',
  referrers: 'bg-emerald-500',
}
const deviceChartColors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4']

function DeviceIcon({ name }: { name: string }) {
  const device = name.toLowerCase()
  const className = 'h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300'

  if (device.includes('tablet') || device.includes('ipad')) {
    return <Tablet className={className} aria-hidden="true" />
  }
  if (device.includes('mobile') || device.includes('phone') || device.includes('android') || device.includes('iphone')) {
    return <Smartphone className={className} aria-hidden="true" />
  }
  if (device.includes('desktop') || device.includes('computer') || device.includes('laptop') || device.includes('windows') || device.includes('mac')) {
    return <Monitor className={className} aria-hidden="true" />
  }

  return <MonitorSmartphone className={className} aria-hidden="true" />
}

function getSafeReferrerHref(value: string) {
  try {
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function ResponsiveReferrer({ url }: { url: string }) {
  const href = getSafeReferrerHref(url)
  const className = 'block min-w-0 flex-1 text-[13px] leading-5 [overflow-wrap:anywhere]'

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} text-slate-700 underline decoration-slate-400/40 underline-offset-2 transition-colors hover:text-[var(--primary-300)] hover:decoration-current focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aff-accent)] dark:text-slate-200`}
      title={`Open ${url} in a new tab`}
    >
      {url}
    </a>
  ) : (
    <span className={`${className} text-slate-700 dark:text-slate-200`} title={url}>{url}</span>
  )
}

function DevicePieChart({ items }: { items: BreakdownItem[] }) {
  const totalClicks = items.reduce((total, item) => total + Math.max(0, item.clicks), 0)
  const maxClicks = Math.max(...items.map(item => Math.max(0, item.clicks)), 1)

  const slices = items.map((item, index) => {
    const clicks = Math.max(0, item.clicks)
    const fraction = totalClicks > 0 ? clicks / totalClicks : 0
    const precedingClicks = items
      .slice(0, index)
      .reduce((total, previousItem) => total + Math.max(0, previousItem.clicks), 0)
    const startAngle = -90 + (totalClicks > 0 ? (precedingClicks / totalClicks) * 360 : 0)
    const endAngle = startAngle + fraction * 360

    if (fraction <= 0) return null

    if (fraction >= 1) {
      return (
        <circle
          key={item.name}
          cx="60"
          cy="60"
          r="52"
          fill={deviceChartColors[index % deviceChartColors.length]}
        />
      )
    }

    const startRadians = (startAngle * Math.PI) / 180
    const endRadians = (endAngle * Math.PI) / 180
    const startX = 60 + 52 * Math.cos(startRadians)
    const startY = 60 + 52 * Math.sin(startRadians)
    const endX = 60 + 52 * Math.cos(endRadians)
    const endY = 60 + 52 * Math.sin(endRadians)
    const largeArc = fraction > 0.5 ? 1 : 0

    return (
      <path
        key={item.name}
        d={`M 60 60 L ${startX} ${startY} A 52 52 0 ${largeArc} 1 ${endX} ${endY} Z`}
        fill={deviceChartColors[index % deviceChartColors.length]}
        stroke="var(--surface-card)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    )
  })

  return (
    <>
      <div className="hidden items-center gap-5 py-2 sm:flex">
        <svg
          viewBox="0 0 120 120"
          className="h-48 w-48 shrink-0 lg:h-56 lg:w-56"
          role="img"
          aria-label={`Device click share: ${items.map((item) => `${item.name} ${Math.round((Math.max(0, item.clicks) / (totalClicks || 1)) * 100)}%`).join(', ')}`}
        >
          <title>Device click share</title>
          {slices}
          <circle
            cx="60"
            cy="60"
            r="27"
            fill="var(--surface-card)"
            stroke="var(--surface-border)"
            strokeWidth="1"
          />
          <text x="60" y="54" textAnchor="middle" className="fill-slate-600 dark:fill-slate-400" fontSize="6" fontWeight="600" letterSpacing="0.8">
            TOTAL CLICKS
          </text>
          <text x="60" y="73" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" fontSize="15" fontWeight="700">
            {formatNumber(totalClicks)}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 divide-y divide-[var(--surface-border)]">
          {items.map((item, index) => {
            const percentage = totalClicks > 0 ? Math.round((Math.max(0, item.clicks) / totalClicks) * 100) : 0
            return (
              <li key={item.name} className="flex min-w-0 items-center gap-2.5 py-2 first:pt-0 last:pb-0 sm:gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--surface-card)]"
                  style={{ backgroundColor: deviceChartColors[index % deviceChartColors.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                    <span className="shrink-0 rounded-full bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {percentage}%
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatNumber(item.uniqueClicks)} unique visitors
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {formatNumber(item.clicks)}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">clicks</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="space-y-3.5 sm:hidden">
        {items.map((item, index) => {
          const clicks = Math.max(0, item.clicks)
          const percentage = Math.min(100, Math.round((clicks / maxClicks) * 100))

          return (
            <div key={item.name} className="border-b border-[var(--surface-border)] pb-3.5 last:border-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-800 dark:text-slate-100">
                  <DeviceIcon name={item.name} />
                  <span className="truncate font-medium">{item.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatNumber(clicks)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: deviceChartColors[index % deviceChartColors.length],
                  }}
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {formatNumber(item.uniqueClicks)} unique visitors
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function BreakdownSection({
  title,
  icon: Icon,
  items,
  accent,
  iconColor,
}: {
  title: string
  icon: typeof Globe2
  items: BreakdownItem[]
  accent: string
  iconColor?: string
}) {
  const filteredItems = items.filter(item => item.name && item.name.trim() !== '' && item.name.trim().toLowerCase() !== 'unknown')
  const maxValue = Math.max(...filteredItems.map(item => Math.max(0, item.clicks)), 1)
  const isReferrerSection = title === 'Top Referrers'

  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--surface-border)]">
          <Icon className={`h-4 w-4 ${iconColor ?? 'text-slate-500 dark:text-slate-400'}`} aria-hidden="true" />
        </span>
        <h4 className="min-w-0 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Clicks</span>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No data to display</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Traffic details will appear here when available.</p>
        </div>
      ) : title === 'Devices' ? (
        <DevicePieChart items={filteredItems} />
      ) : (
        <div className="space-y-3.5">
          {filteredItems.slice(0, 4).map((item, index) => {
            const clicks = Math.max(0, item.clicks)
            const pct = Math.min(100, Math.round((clicks / maxValue) * 100))
            return (
              <div key={`${title}-${item.name}-${index}`} className="border-b border-[var(--surface-border)] pb-3.5 last:border-0 last:pb-0">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-1 items-start gap-2.5 text-slate-800 dark:text-slate-100">
                    {title === 'Browsers' && <BrowserLogo name={item.name} />}
                    {title === 'Top Countries' && <CountryFlag country={item.name} />}
                    {isReferrerSection ? (
                      <ResponsiveReferrer url={item.name} />
                    ) : (
                      <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
                    )}
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums ${isReferrerSection ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {isReferrerSection && <Flame className="h-3.5 w-3.5 fill-orange-400/20" aria-hidden="true" />}
                    {formatNumber(clicks)}
                  </span>
                </div>

                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
                  role="meter"
                  aria-label={`${item.name} clicks compared with the top entry`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div
                    className={`${accent} h-full rounded-full transition-[width] duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{formatNumber(item.uniqueClicks)} unique visitors</div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function TrafficBreakdown({
  referrerBreakdown = [],
  browserBreakdown = [],
  deviceBreakdown = [],
  countryBreakdown = [],
}: TrafficBreakdownProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BreakdownSection
          title="Devices"
          icon={MonitorSmartphone}
          items={deviceBreakdown}
          accent={palette.browsers}
          iconColor="text-emerald-600 dark:text-emerald-300"
        />
        <BreakdownSection
          title="Top Countries"
          icon={Globe2}
          items={countryBreakdown}
          accent={palette.countries}
          iconColor="text-sky-500"
        />
        <BreakdownSection
          title="Browsers"
          icon={Globe2}
          items={browserBreakdown}
          accent={palette.browsers}
          iconColor="text-violet-600 dark:text-violet-300"
        />
        <BreakdownSection
          title="Top Referrers"
          icon={Globe2}
          items={referrerBreakdown}
          accent={palette.referrers}
          iconColor="text-emerald-600 dark:text-emerald-300"
        />
    </div>
  )
}
