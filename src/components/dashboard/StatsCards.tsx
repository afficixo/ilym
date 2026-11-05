'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/ui/StatsCard'
import { MousePointerClick, Users, Link2, CircleDollarSign } from 'lucide-react'
import { getCountryFlag } from '@/lib/utils/country'
import { motion } from 'framer-motion'

interface StatsCardsProps {
  stats: {
    totalClicks: number
    uniqueClicks: number
    totalLinks: number
    revenue?: number
    totalPayout?: number
  }
  chartData?: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
    }[]
  }
  countryBreakdown?: {
    country: string
    clicks: number
    uniqueClicks: number
  }[]
  period?: 'week' | 'month' | 'year'
  onPeriodChange?: (period: 'week' | 'month' | 'year') => void
  totalPayout?: number
  showConversions?: boolean
  isLoading?: boolean
}

function formatCurrency(value: number | undefined, decimalPlaces = 2) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(decimalPlaces)}` : '$0.00'
}

export default function StatsCards({
  stats,
  chartData,
  countryBreakdown = [],
  period = 'week',
  onPeriodChange,
  totalPayout = 0,
  showConversions = false,
  isLoading = false,
}: StatsCardsProps) {
  const [showCredit, setShowCredit] = useState(false)

  const countryHighlights = [...(countryBreakdown || [])]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 3)

  const flagColors = ['ring-[#5ff442]/30 bg-[#5ff442]/[0.06]', 'ring-violet-400/30 bg-violet-400/6', 'ring-emerald-400/30 bg-emerald-400/6']

  const activeLabel = showCredit ? 'Total Credit' : 'Total Cost'
  const activeValue = showCredit ? totalPayout : stats.revenue
  const clickTrend = chartData?.datasets.find(dataset => /click/i.test(dataset.label))?.data
  const visitorTrend = chartData?.datasets.find(dataset => /unique|visitor/i.test(dataset.label))?.data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <StatsCard
          title="Total Links"
          value={stats.totalLinks}
          icon={Link2}
          color="purple"
          delay={0}
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Clicks"
          value={stats.totalClicks}
          icon={MousePointerClick}
          color="green"
          sparklineData={clickTrend}
          delay={100}
          isLoading={isLoading}
          showSparklinePlaceholder
        />
        <StatsCard
          title="Unique Visitors"
          value={stats.uniqueClicks}
          icon={Users}
          color="blue"
          sparklineData={visitorTrend}
          delay={200}
          isLoading={isLoading}
          showSparklinePlaceholder
        />
        {showConversions ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="h-full min-h-[94px] min-w-0 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-left shadow-[var(--shadow-sm)] transition-colors duration-200 hover:border-[var(--primary-600)] hover:bg-[var(--primary-50)] sm:p-4 lg:p-3 dark:hover:border-[var(--primary-500)] dark:hover:bg-[#5ff442]/10"
            onClick={() => setShowCredit((current) => !current)}
            aria-label={`Toggle balance view. Current value: ${activeLabel}`}
            aria-busy={isLoading}
            disabled={isLoading}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-slate-500 dark:text-slate-400 sm:text-xs sm:leading-5 sm:tracking-[0.12em]">{activeLabel}</p>
              <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-emerald-700 dark:text-emerald-200">
                <CircleDollarSign className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
            </div>
            {isLoading ? (
              <div aria-hidden="true" className="dashboard-skeleton mt-1 h-7 w-24 max-w-full sm:h-8" />
            ) : (
              <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{formatCurrency(activeValue)}</p>
            )}
          </motion.button>
        ) : (
          <StatsCard
            title="Revenue"
            value={stats.revenue ?? 0}
            icon={CircleDollarSign}
            color="green"
            prefix="$"
            decimalPlaces={2}
            delay={300}
            isLoading={isLoading}
          />
        )}
      </div>

    </div>
  )
}