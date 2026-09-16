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
}: StatsCardsProps) {
  const [showCredit, setShowCredit] = useState(false)

  const countryHighlights = [...(countryBreakdown || [])]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 3)

  const flagColors = ['ring-sky-400/30 bg-sky-400/6', 'ring-violet-400/30 bg-violet-400/6', 'ring-emerald-400/30 bg-emerald-400/6']

  const activeLabel = showCredit ? 'Total Credit' : 'Total Cost'
  const activeValue = showCredit ? totalPayout : stats.revenue

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard
          title="Total Links"
          value={stats.totalLinks}
          icon={Link2}
          color="purple"
          delay={0}
        />
        <StatsCard
          title="Total Clicks"
          value={stats.totalClicks}
          icon={MousePointerClick}
          color="indigo"
          delay={100}
        />
        <StatsCard
          title="Unique Visitors"
          value={stats.uniqueClicks}
          icon={Users}
          color="green"
          delay={200}
        />
        {showConversions ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="h-full min-h-[94px] min-w-0 w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors duration-200 hover:bg-slate-50 sm:p-4 dark:border-slate-700/30 dark:bg-slate-800/30 dark:hover:bg-slate-800/40"
            onClick={() => setShowCredit((current) => !current)}
            aria-label={`Toggle balance view. Current value: ${activeLabel}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{activeLabel}</p>
              <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{formatCurrency(activeValue)}</p>
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
          />
        )}
      </div>

    </div>
  )
}