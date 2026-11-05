'use client'

import { useId } from 'react'
import { LucideIcon } from 'lucide-react'
import { formatNumber } from '@/lib/utils/helpers'
import { motion } from 'framer-motion'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: number
  color?: 'indigo' | 'green' | 'purple' | 'red' | 'blue' | 'orange'
  subtitle?: string
  sparklineData?: number[]
  prefix?: string
  decimalPlaces?: number
  delay?: number
  className?: string
  isLoading?: boolean
  showSparklinePlaceholder?: boolean
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'indigo',
  subtitle,
  sparklineData,
  prefix = '',
  decimalPlaces,
  delay = 0,
  className = '',
  isLoading = false,
  showSparklinePlaceholder = false,
}: StatsCardProps) {
  const sparklineId = `sparkline-${useId().replace(/:/g, '')}`
  const colorClasses = {
    indigo: 'text-indigo-700 dark:text-indigo-200',
    green: 'text-emerald-700 dark:text-emerald-200',
    purple: 'text-violet-700 dark:text-violet-200',
    red: 'text-rose-700 dark:text-rose-200',
    blue: 'text-sky-700 dark:text-sky-200',
    orange: 'text-amber-700 dark:text-amber-200',
  }

  const isPositive = trend !== undefined && trend >= 0
  const sparklineValues = (sparklineData ?? [])
    .filter(Number.isFinite)
    .slice(-24)
  const minimum = Math.min(...sparklineValues)
  const maximum = Math.max(...sparklineValues)
  const sparklinePoints = sparklineValues.map((value, index) => ({
    x: (index / (sparklineValues.length - 1)) * 100,
    y: 21 - ((value - minimum) / (maximum - minimum || 1)) * 16,
  }))
  const sparklinePath = sparklinePoints.length > 1 && maximum > minimum
    ? sparklinePoints.reduce((path, point, index, points) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      const previous = points[index - 1]
      const midpoint = (previous.x + point.x) / 2
      return `${path} C ${midpoint.toFixed(2)} ${previous.y.toFixed(2)}, ${midpoint.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    }, '')
    : null
  const sparklineAreaPath = sparklinePath
    ? `M ${sparklinePoints[0].x.toFixed(2)} 24 L ${sparklinePoints[0].x.toFixed(2)} ${sparklinePoints[0].y.toFixed(2)}${sparklinePath.slice(sparklinePath.indexOf(' C'))} L ${sparklinePoints[sparklinePoints.length - 1].x.toFixed(2)} 24 Z`
    : null
  const showSparkline = Boolean(sparklinePath) || (isLoading && showSparklinePlaceholder)
  const sparklineColors = {
    indigo: '#6366f1',
    green: '#10b981',
    purple: '#8b5cf6',
    red: '#f43f5e',
    blue: '#0ea5e9',
    orange: '#f59e0b',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: delay / 1000 }}
      aria-busy={isLoading}
      className={`h-full min-h-[94px] min-w-0 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-sm)] transition-colors duration-200 hover:border-[var(--primary-600)] hover:bg-[var(--primary-50)] lg:p-3 lg:min-h-[108px] dark:hover:border-[var(--primary-500)] dark:hover:bg-[#5ff442]/10 ${showSparkline ? 'min-h-[122px]' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-slate-600 dark:text-slate-300 sm:text-xs sm:leading-5 sm:tracking-[0.12em]">
            {title}
          </p>
          {isLoading ? (
            <div aria-hidden="true" className="dashboard-skeleton mt-2 h-8 w-24 max-w-full sm:h-9 lg:mt-1 lg:h-8" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:mt-1 lg:text-2xl">
              {prefix}{decimalPlaces !== undefined
                ? value === 0
                  ? '0'
                  : value.toFixed(decimalPlaces)
                : formatNumber(value)}
            </p>
          )}
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          )}
        </div>
        <div aria-hidden="true" className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
      </div>

      {isLoading && showSparklinePlaceholder ? (
        <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-2 h-7 w-full lg:mt-1 lg:h-6" aria-hidden="true">
          <path d="M 0 23.5 H 100" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path
            d="M 0 21 C 12 21, 12 18, 24 18 S 36 21, 48 19 S 60 17, 72 18 S 88 8, 100 6"
            className="dashboard-skeleton-chart-line"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : sparklinePath ? (
        <svg
          viewBox="0 0 100 26"
          preserveAspectRatio="none"
          className="mt-2 h-7 w-full overflow-visible lg:mt-1 lg:h-6"
          role="img"
          aria-label={`${title} activity trend across ${sparklineValues.length} periods`}
        >
          <title>{title} activity trend across {sparklineValues.length} periods</title>
          <defs>
            <linearGradient id={sparklineId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={sparklineColors[color]} stopOpacity="0.2" />
              <stop offset="100%" stopColor={sparklineColors[color]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 23.5 H 100"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path d={sparklineAreaPath ?? ''} fill={`url(#${sparklineId})`} />
          <path
            d={sparklinePath}
            fill="none"
            stroke={sparklineColors[color]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={sparklinePoints[sparklinePoints.length - 1].x}
            cy={sparklinePoints[sparklinePoints.length - 1].y}
            r="1.7"
            fill={sparklineColors[color]}
            stroke="var(--surface-card)"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300">vs last month</span>
        </div>
      )}
    </motion.div>
  )
}