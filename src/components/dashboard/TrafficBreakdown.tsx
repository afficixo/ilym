'use client'

import { AppWindow, Flame, Globe2, Link2, Monitor, MonitorSmartphone, Smartphone, Tablet } from 'lucide-react'
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
  devices: 'bg-emerald-500',
  countries: 'bg-sky-500',
  browsers: 'bg-violet-500',
  referrers: 'bg-[var(--primary-600)]',
}

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
    <section className="flex h-full flex-col rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
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
      ) : (
        <div className="flex flex-col space-y-3.5 sm:flex-1 sm:space-y-0">
          {filteredItems.slice(0, 4).map((item, index) => {
            const clicks = Math.max(0, item.clicks)
            const pct = Math.min(100, Math.round((clicks / maxValue) * 100))
            return (
              <div key={`${title}-${item.name}-${index}`} className="border-b border-[var(--surface-border)] pb-3.5 last:border-0 last:pb-0 sm:flex sm:flex-1 sm:flex-col sm:justify-center sm:py-2">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-1 items-start gap-2.5 text-slate-800 dark:text-slate-100">
                    {title === 'Devices' && <DeviceIcon name={item.name} />}
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

                <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{formatNumber(item.uniqueClicks)} unique visitors</div>
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
          accent={palette.devices}
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
          icon={AppWindow}
          items={browserBreakdown}
          accent={palette.browsers}
          iconColor="text-violet-600 dark:text-violet-300"
        />
        <BreakdownSection
          title="Top Referrers"
          icon={Link2}
          items={referrerBreakdown}
          accent={palette.referrers}
          iconColor="text-emerald-600 dark:text-emerald-300"
        />
    </div>
  )
}
