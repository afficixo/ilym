'use client'

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
  prefix?: string
  decimalPlaces?: number
  delay?: number
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'indigo',
  subtitle,
  prefix = '',
  decimalPlaces,
  delay = 0,
  className = '',
}: StatsCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-300',
    green: 'bg-emerald-500/10 text-emerald-300',
    purple: 'bg-violet-500/10 text-violet-300',
    red: 'bg-rose-500/10 text-rose-300',
    blue: 'bg-sky-500/10 text-sky-300',
    orange: 'bg-amber-500/10 text-amber-300',
  }

  const isPositive = trend !== undefined && trend >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: delay / 1000 }}
      className={`h-full min-h-[94px] min-w-0 rounded-lg border border-slate-700/30 bg-slate-800/30 p-4 transition-colors duration-200 hover:bg-slate-800/40 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
            {prefix}{decimalPlaces !== undefined
              ? value === 0
                ? '0'
                : value.toFixed(decimalPlaces)
              : formatNumber(value)}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-500">vs last month</span>
        </div>
      )}
    </motion.div>
  )
}