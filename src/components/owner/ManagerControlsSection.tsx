'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowUpDown,
  BadgeDollarSign,
  Check,
  ChevronDown,
  CircleDollarSign,
  Globe2,
  LoaderCircle,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { COUNTRY_OPTIONS, getCountryFlag, getCountryLabel } from '@/lib/utils/country'

type CountryClickRate = { countryCode: string; rate: number }
type ManagerOption = {
  id: string
  username: string
  fullName: string | null
  clickRate: number
  commissionRate: number
  referralCommissionRate: number
  countryClickRates: CountryClickRate[]
  status?: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REJECTED'
}

type RateField = 'clickRate' | 'commissionRate' | 'referralCommissionRate'
type ManagerSort = 'name' | 'clickRate' | 'commissionRate' | 'referralCommissionRate'
type ManagerRateDraft = {
  clickRate: string
  commissionRate: string
  referralCommissionRate: string
}

function getDirtyFields(manager: ManagerOption, draft: ManagerRateDraft): Record<RateField, boolean> {
  return {
    clickRate:
      draft.clickRate.trim() !== '' &&
      Number.isFinite(Number(draft.clickRate)) &&
      Number(draft.clickRate) !== manager.clickRate,
    commissionRate:
      draft.commissionRate.trim() !== '' &&
      Number.isFinite(Number(draft.commissionRate)) &&
      Number(draft.commissionRate) !== manager.commissionRate,
    referralCommissionRate:
      draft.referralCommissionRate.trim() !== '' &&
      Number.isFinite(Number(draft.referralCommissionRate)) &&
      Number(draft.referralCommissionRate) !== manager.referralCommissionRate,
  }
}

function formatRateDraft(value: string, decimalPlaces?: number): string {
  const parsedValue = Number(value)
  if (value.trim() === '' || !Number.isFinite(parsedValue)) return '—'
  return decimalPlaces === undefined ? String(parsedValue) : parsedValue.toFixed(decimalPlaces)
}

function getManagerInitials(manager: ManagerOption): string {
  return (manager.fullName || manager.username)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function ManagerControlsSection() {
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [managerDrafts, setManagerDrafts] = useState<Record<string, ManagerRateDraft>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savingField, setSavingField] = useState<{ managerId: string; field: RateField | 'countryClickRate' } | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null)
  const [managerSort, setManagerSort] = useState<ManagerSort>('name')
  const [selectedCountryByManager, setSelectedCountryByManager] = useState<Record<string, string>>({})
  const [countryRateDrafts, setCountryRateDrafts] = useState<Record<string, string>>({})
  const [countryRatesAvailable, setCountryRatesAvailable] = useState(true)
  const [bulkCountryCode, setBulkCountryCode] = useState('US')
  const [bulkCountryRate, setBulkCountryRate] = useState('0.000')
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const bulkRateFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchManagers = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch('/api/owner/managers', {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load manager accounts.')

        const data = await response.json()
        setCountryRatesAvailable(data.countryRatesAvailable !== false)
        const managerOptions = Array.isArray(data.managers)
          ? data.managers
              .filter((manager: ManagerOption) => manager.status === 'ACTIVE' || !manager.status)
              .map((manager: ManagerOption) => ({
                id: manager.id,
                username: manager.username,
                fullName: manager.fullName || null,
                clickRate: Number(manager.clickRate ?? 0),
                countryClickRates: Array.isArray(manager.countryClickRates)
                  ? manager.countryClickRates.map((rate: CountryClickRate) => ({
                      countryCode: rate.countryCode,
                      rate: Number(rate.rate),
                    }))
                  : [],
                commissionRate: Number(manager.commissionRate ?? 20),
                referralCommissionRate: Number(manager.referralCommissionRate ?? 5),
                status: manager.status || 'ACTIVE',
              }))
          : []

        setManagers(managerOptions)
        const initialUsRates = Array.from(new Set<string>(managerOptions.map((manager: ManagerOption) =>
          (manager.countryClickRates.find((rate) => rate.countryCode === 'US')?.rate ?? manager.clickRate).toFixed(3),
        )))
        setBulkCountryRate(initialUsRates.length === 1 ? initialUsRates[0] : '')
        setSelectedCountryByManager(Object.fromEntries(managerOptions.map((manager: ManagerOption) => [manager.id, 'US'])))
        setCountryRateDrafts(Object.fromEntries(managerOptions.map((manager: ManagerOption) => [
          manager.id,
          String(manager.countryClickRates.find((rate) => rate.countryCode === 'US')?.rate ?? manager.clickRate),
        ])))
        setManagerDrafts(
          Object.fromEntries(
            managerOptions.map((manager: ManagerOption) => [
              manager.id,
              {
                clickRate: String(manager.clickRate),
                commissionRate: String(manager.commissionRate),
                referralCommissionRate: String(manager.referralCommissionRate),
              },
            ]),
          ),
        )
      } catch (error) {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : 'Unable to load manager accounts.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void fetchManagers()

    return () => controller.abort()
  }, [loadAttempt])

  const updateManagerDraft = (
    managerId: string,
    field: 'clickRate' | 'commissionRate' | 'referralCommissionRate',
    value: string,
  ) => {
    setManagerDrafts((current) => ({
      ...current,
      [managerId]: { ...current[managerId], [field]: value },
    }))
  }

  const updateCountrySelection = (manager: ManagerOption, countryCode: string) => {
    setSelectedCountryByManager((current) => ({ ...current, [manager.id]: countryCode }))
    const savedRate = manager.countryClickRates.find((rate) => rate.countryCode === countryCode)?.rate
    setCountryRateDrafts((current) => ({
      ...current,
      [manager.id]: String(savedRate ?? (countryCode === 'US' ? manager.clickRate : 0)),
    }))
  }

  const saveBulkCountryRate = async (rate: number, removed = false) => {
    if (!Number.isFinite(rate) || rate < 0 || !countryRatesAvailable) return

    setIsBulkSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-update-manager-country-click-rate',
          countryCode: bulkCountryCode,
          rate,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to update rates for all managers')

      setManagers((current) => current.map((manager) => ({
        ...manager,
        clickRate: bulkCountryCode === 'US' ? rate : manager.clickRate,
        countryClickRates: [
          ...manager.countryClickRates.filter((entry) => entry.countryCode !== bulkCountryCode),
          { countryCode: bulkCountryCode, rate },
        ].sort((a, b) => a.countryCode.localeCompare(b.countryCode)),
      })))
      setBulkCountryRate(String(rate))
      setCountryRateDrafts((current) => Object.fromEntries(
        Object.entries(current).map(([managerId, value]) => [
          managerId,
          (selectedCountryByManager[managerId] || 'US') === bulkCountryCode ? String(rate) : value,
        ]),
      ))
      if (bulkCountryCode === 'US') {
        setManagerDrafts((current) => Object.fromEntries(
          Object.entries(current).map(([managerId, draft]) => [
            managerId,
            { ...draft, clickRate: String(rate) },
          ]),
        ))
      }
      setFeedback({
        type: 'success',
        message: removed
          ? `${getCountryLabel(bulkCountryCode)} rate removed for all managers. Clicks from this country will not count as qualified.`
          : data.message || 'Country click rate updated for all managers.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update rates for all managers',
      })
    } finally {
      setIsBulkSaving(false)
    }
  }

  const handleBulkCountryRateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const rate = Number(bulkCountryRate)
    if (!Number.isFinite(rate) || rate < 0) return
    await saveBulkCountryRate(rate)
  }

  const saveManagerCountryRate = async (manager: ManagerOption, rate: number, removed = false) => {
    const countryCode = selectedCountryByManager[manager.id] || 'US'
    if (!Number.isFinite(rate) || rate < 0) return

    setIsSubmitting(true)
    setSavingField({ managerId: manager.id, field: 'countryClickRate' })
    setFeedback(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-manager-country-click-rate',
          managerId: manager.id,
          countryCode,
          rate,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to update country click rate')

      const countryRate = data.countryRate as CountryClickRate
      setManagers((current) => current.map((item) => item.id === manager.id
        ? {
            ...item,
            clickRate: countryCode === 'US' ? Number(countryRate.rate) : item.clickRate,
            countryClickRates: [
              ...item.countryClickRates.filter((entry) => entry.countryCode !== countryRate.countryCode),
              countryRate,
            ].sort((a, b) => a.countryCode.localeCompare(b.countryCode)),
          }
        : item,
      ))
      setCountryRateDrafts((current) => ({ ...current, [manager.id]: String(countryRate.rate) }))
      if (countryCode === 'US') {
        updateManagerDraft(manager.id, 'clickRate', String(countryRate.rate))
      }
      setFeedback({
        type: 'success',
        message: removed
          ? `${getCountryLabel(countryCode)} rate removed. Clicks from this country will not count as qualified.`
          : data.message || 'Country click rate updated successfully.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update country click rate',
      })
    } finally {
      setIsSubmitting(false)
      setSavingField(null)
    }
  }

  const handleManagerCountryRateSubmit = async (event: FormEvent<HTMLFormElement>, manager: ManagerOption) => {
    event.preventDefault()
    const rate = Number(countryRateDrafts[manager.id])
    if (!Number.isFinite(rate) || rate < 0) return
    await saveManagerCountryRate(manager, rate)
  }

  const handleManagerRatesSubmit = async (event: FormEvent<HTMLFormElement>, managerId: string) => {
    event.preventDefault()
    const draft = managerDrafts[managerId]
    if (!draft) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-manager-rates',
          managerId,
          clickRate: Number(draft.clickRate),
          commissionRate: Number(draft.commissionRate),
          referralCommissionRate: Number(draft.referralCommissionRate),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to update manager rates')

      setManagers((current) => current.map((manager) =>
        manager.id === managerId
          ? {
              ...manager,
              clickRate: Number(data.clickRate),
              commissionRate: Number(data.commissionRate),
              referralCommissionRate: Number(data.referralCommissionRate),
            }
          : manager,
      ))
      setManagerDrafts((current) => ({
        ...current,
        [managerId]: {
          clickRate: String(data.clickRate),
          commissionRate: String(data.commissionRate),
          referralCommissionRate: String(data.referralCommissionRate),
        },
      }))
      if ((selectedCountryByManager[managerId] || 'US') === 'US') {
        setCountryRateDrafts((current) => ({ ...current, [managerId]: String(data.clickRate) }))
      }
      setFeedback({ type: 'success', message: data.message || 'Manager rates updated successfully.' })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update manager rates',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    'h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm tabular-nums text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400'
  const saveButtonClassName =
    'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-100 dark:focus-visible:ring-offset-slate-950'
  const renderRateAction = (
    managerId: string,
    field: RateField | 'countryClickRate',
    isDirty: boolean,
    ariaLabel: string,
  ) => {
    const isSaving = savingField?.managerId === managerId && savingField.field === field

    if (!isDirty && !isSaving) {
      return (
        <span className="inline-flex h-10 shrink-0 items-center gap-1 px-1 text-xs text-slate-400 dark:text-slate-500">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Saved
        </span>
      )
    }

    return (
      <button
        type="submit"
        disabled={isSubmitting}
        aria-label={ariaLabel}
        className={`${saveButtonClassName} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-600`}
      >
        {isSaving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {isSaving ? 'Saving' : 'Save'}
      </button>
    )
  }
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredManagers = managers
    .filter((manager) =>
      `${manager.fullName ?? ''} ${manager.username}`.toLocaleLowerCase().includes(normalizedSearchQuery),
    )
    .sort((first, second) => {
      if (managerSort === 'name') {
        return (first.fullName || first.username).localeCompare(second.fullName || second.username)
      }

      const rateDifference = second[managerSort] - first[managerSort]
      return rateDifference || (first.fullName || first.username).localeCompare(second.fullName || second.username)
    })
  const configuredCountryCodes = new Set<string>(['US'])
  managers.forEach((manager) => manager.countryClickRates.forEach((rate) => configuredCountryCodes.add(rate.countryCode)))
  const savedCountryRates = COUNTRY_OPTIONS
    .filter((country) => configuredCountryCodes.has(country.code))
    .map((country) => {
      const rates = managers.map((manager) => (
        manager.countryClickRates.find((rate) => rate.countryCode === country.code)?.rate
        ?? (country.code === 'US' ? manager.clickRate : 0)
      ))
      const uniqueRates = Array.from(new Set(rates.map((rate) => rate.toFixed(3))))
      const configuredManagerCount = managers.filter((manager) =>
        country.code === 'US' || manager.countryClickRates.some((rate) => rate.countryCode === country.code),
      ).length

      return {
        ...country,
        rate: uniqueRates.length === 1 ? uniqueRates[0] : null,
        minimumRate: rates.length ? Math.min(...rates).toFixed(3) : '0.000',
        maximumRate: rates.length ? Math.max(...rates).toFixed(3) : '0.000',
        configuredManagerCount,
      }
    })
    .filter((country) => country.maximumRate !== '0.000')
  const selectBulkCountry = (countryCode: string) => {
    setBulkCountryCode(countryCode)
    const savedRate = savedCountryRates.find((country) => country.code === countryCode)?.rate
    setBulkCountryRate(savedRate ?? (configuredCountryCodes.has(countryCode) ? '' : '0.000'))
    bulkRateFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const selectedBulkCountryRate = savedCountryRates.find((country) => country.code === bulkCountryCode)
  const averageUsRate = managers.length
    ? managers.reduce((total, manager) => total + manager.clickRate, 0) / managers.length
    : 0

  return (
    <section className="w-full min-w-0 space-y-6 bg-transparent">
      {!isLoading && !loadError && managers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Active managers',
              value: String(managers.length),
              detail: 'Accounts available to manage',
              icon: Users,
              accent: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
            },
            {
              label: 'Saved geos',
              value: String(savedCountryRates.length),
              detail: 'All other countries default to $0.000',
              icon: Globe2,
              accent: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
            },
            {
              label: 'Average US rate',
              value: `$${averageUsRate.toFixed(3)}`,
              detail: 'Average rate per manager',
              icon: CircleDollarSign,
              accent: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10',
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">{stat.detail}</p>
                </div>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${stat.accent}`}>
                  <stat.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && !loadError && managers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manager accounts</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {normalizedSearchQuery
                    ? `${filteredManagers.length} of ${managers.length} managers`
                    : `${managers.length} active ${managers.length === 1 ? 'manager' : 'managers'}`}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or username"
              aria-label="Search managers by name or username"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear manager search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
              <label className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Sort managers</span>
                <select
                  value={managerSort}
                  onChange={(event) => setManagerSort(event.target.value as ManagerSort)}
                  aria-label="Sort managers"
                  className="max-w-36 bg-transparent outline-none"
                >
                  <option value="name">Name</option>
                  <option value="clickRate">Click rate</option>
                  <option value="commissionRate">Commission</option>
                  <option value="referralCommissionRate">Referral</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !loadError && !countryRatesAvailable && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:border-l-amber-400 dark:bg-slate-950"
        >
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Country rates unavailable</p>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Migration required
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
              Apply the pending country-click-rates migration to enable geo-rate editing. Existing US rates and manager controls are unaffected.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !loadError && managers.length > 0 && (
        <form
          ref={bulkRateFormRef}
          onSubmit={(event) => void handleBulkCountryRateSubmit(event)}
          className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 dark:border-emerald-500/10 dark:from-emerald-950/40 dark:to-slate-950 sm:flex-row sm:items-center sm:p-5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-900/15">
              <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Set a geo rate</h2>
                <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-300">
                  All managers
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                Set one rate for this country across all manager accounts. Individual rates remain editable below.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto] sm:items-end sm:p-5">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Country</span>
              <select
                aria-label="Country rate to apply to all managers"
                value={bulkCountryCode}
                onChange={(event) => selectBulkCountry(event.target.value)}
                disabled={!countryRatesAvailable || isBulkSaving}
                className={`${inputClassName} w-full`}
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Rate per click (USD)</span>
              <input
                aria-label="Click rate to apply to all managers"
                type="number"
                min="0"
                step="0.001"
                value={bulkCountryRate}
                onChange={(event) => setBulkCountryRate(event.target.value)}
                placeholder={selectedBulkCountryRate?.rate === null ? 'Set one rate' : '0.000'}
                required
                disabled={!countryRatesAvailable || isBulkSaving}
                className={`${inputClassName} w-full`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={!countryRatesAvailable || isBulkSaving || bulkCountryRate.trim() === '' || !Number.isFinite(Number(bulkCountryRate)) || Number(bulkCountryRate) < 0}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-950"
              >
                {isBulkSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {isBulkSaving ? 'Applying…' : countryRatesAvailable ? 'Apply rate' : 'Setup required'}
              </button>
              {selectedBulkCountryRate && selectedBulkCountryRate.maximumRate !== '0.000' && (
                <button
                  type="button"
                  disabled={!countryRatesAvailable || isBulkSaving}
                  aria-label={`Remove ${getCountryLabel(bulkCountryCode)} rate for all managers`}
                  onClick={() => void saveBulkCountryRate(0, true)}
                  className={`${saveButtonClassName} h-10 border-red-200 bg-white px-3 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove rate
                </button>
              )}
            </div>
          </div>
          {countryRatesAvailable && selectedBulkCountryRate?.rate === null && (
            <p className="mx-4 -mt-2 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 sm:mx-5">
              Managers currently have different rates for this country. Enter a rate to set one value for everyone.
            </p>
          )}
          {bulkCountryCode === 'US' && (
            <p className="mx-4 mb-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400 sm:mx-5">
              Applying a United States rate also updates the existing individual US click-rate field for every manager.
            </p>
          )}
        </form>
      )}

      {!isLoading && !loadError && managers.length > 0 && (
        <section
          aria-labelledby="saved-country-rates-title"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="saved-country-rates-title" className="text-sm font-semibold text-slate-950 dark:text-white">
                Saved geo rates
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select a country to edit its rate for all managers. Countries not listed use $0.000 per click.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {savedCountryRates.length} {savedCountryRates.length === 1 ? 'country' : 'countries'}
            </span>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            {savedCountryRates.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => selectBulkCountry(country.code)}
                disabled={!countryRatesAvailable || isBulkSaving}
                aria-label={`Edit ${country.name} rate`}
                aria-pressed={bulkCountryCode === country.code}
                className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                  bulkCountryCode === country.code
                    ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-emerald-500/20 dark:hover:bg-slate-900'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    {getCountryFlag(country.code)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {country.name}
                      <span className="ml-1.5 text-xs font-medium text-slate-400">{country.code}</span>
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      {country.configuredManagerCount} of {managers.length} managers configured
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                    {country.rate === null ? 'Mixed rates' : `$${Number(country.rate).toFixed(3)}`}
                  </span>
                  {country.rate === null && country.minimumRate !== '0.000' && (
                    <span className="block text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                      ${country.minimumRate}–${country.maximumRate}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
            className="shrink-0 text-lg leading-none text-current opacity-70 transition hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-5" aria-busy="true">
          <p role="status" className="sr-only">Loading manager accounts…</p>
          <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="dashboard-skeleton h-3 w-24" style={{ animationDelay: `${item * 90}ms` }} />
                    <div className="dashboard-skeleton h-7 w-20" style={{ animationDelay: `${item * 90}ms` }} />
                    <div className="dashboard-skeleton h-2.5 w-32 max-w-full" style={{ animationDelay: `${item * 90}ms` }} />
                  </div>
                  <div className="dashboard-skeleton h-9 w-9 rounded-lg" style={{ animationDelay: `${item * 90}ms` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manager accounts</p>
                  <div className="dashboard-skeleton mt-1.5 h-3 w-28" />
                </div>
              </div>
              <div className="flex gap-2" aria-hidden="true">
                <div className="dashboard-skeleton h-10 min-w-0 flex-1 rounded-lg sm:w-72 sm:flex-none" />
                <div className="dashboard-skeleton h-10 w-28 rounded-lg" />
              </div>
            </div>

          </div>

          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-slate-950">
            <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/10 dark:bg-emerald-950/20 sm:px-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Set a geo rate</p>
                  <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-300">All managers</span>
                </div>
                <div aria-hidden="true" className="dashboard-skeleton mt-2 h-2.5 w-3/4 max-w-md" />
              </div>
            </div>
            <div aria-hidden="true" className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto] sm:items-end sm:p-5">
              {[0, 1].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="dashboard-skeleton h-3 w-28" />
                  <div className="dashboard-skeleton h-10 w-full rounded-lg" />
                </div>
              ))}
              <div className="dashboard-skeleton h-10 w-28 rounded-lg" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Saved geo rates</p>
                <div aria-hidden="true" className="dashboard-skeleton h-2.5 w-64 max-w-full" />
              </div>
              <div aria-hidden="true" className="dashboard-skeleton h-3 w-16 shrink-0" />
            </div>
            <div aria-hidden="true" className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="dashboard-skeleton h-[4.25rem] rounded-xl" style={{ animationDelay: `${item * 90}ms` }} />
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="space-y-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 sm:px-4 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="dashboard-skeleton h-10 w-10 shrink-0 rounded-full" style={{ animationDelay: `${item * 90}ms` }} />
                    <div className="min-w-0 space-y-2">
                      <div className="dashboard-skeleton h-3.5 w-36 max-w-full" style={{ animationDelay: `${item * 90}ms` }} />
                      <div className="dashboard-skeleton h-2.5 w-24 max-w-full" style={{ animationDelay: `${item * 90}ms` }} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden gap-1.5 md:flex">
                      {[0, 1, 2].map((rate) => (
                        <div key={rate} className="dashboard-skeleton h-11 w-[4.5rem] rounded-lg" style={{ animationDelay: `${item * 90}ms` }} />
                      ))}
                    </div>
                    <div className="dashboard-skeleton h-8 w-14 rounded-md" style={{ animationDelay: `${item * 90}ms` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-500/20 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Couldn&apos;t load manager accounts</p>
            <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Try again
          </button>
        </div>
      ) : filteredManagers.length > 0 ? (
        <div className="w-full min-w-0 space-y-2">
          {filteredManagers.map((manager) => {
            const draft = managerDrafts[manager.id] || {
              clickRate: String(manager.clickRate),
              commissionRate: String(manager.commissionRate),
              referralCommissionRate: String(manager.referralCommissionRate),
            }
            const isExpanded = expandedManagerId === manager.id
            const dirtyFields = getDirtyFields(manager, draft)
            const selectedCountry = selectedCountryByManager[manager.id] || 'US'
            const configuredCountryRate = manager.countryClickRates.find((rate) => rate.countryCode === selectedCountry)?.rate
            const savedCountryRate = configuredCountryRate ?? (selectedCountry === 'US' ? manager.clickRate : 0)
            const countryRateDraft = countryRateDrafts[manager.id] ?? String(savedCountryRate)
            const countryRateDirty = countryRateDraft.trim() !== '' &&
              Number.isFinite(Number(countryRateDraft)) &&
              Number(countryRateDraft) >= 0 &&
              Number(countryRateDraft) !== savedCountryRate
            const dirtyFieldCount = Object.values(dirtyFields).filter(Boolean).length + (countryRateDirty ? 1 : 0)
            const hasDirtyManagerRates = Object.values(dirtyFields).some(Boolean)

            return (
              <article
                key={manager.id}
                className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 sm:p-5 motion-reduce:transition-none ${
                  isExpanded
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500/10 dark:border-emerald-800 dark:bg-emerald-950/20 dark:ring-emerald-400/10'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-1 ring-inset transition-colors duration-200 motion-reduce:transition-none ${
                      isExpanded
                        ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:ring-emerald-800'
                        : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                    }`}>
                      {getManagerInitials(manager)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {manager.fullName || manager.username}
                        </h2>
                        {dirtyFieldCount > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                            Unsaved
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        @{manager.username}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium tabular-nums text-slate-600 dark:text-slate-300 md:hidden">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          US ${formatRateDraft(draft.clickRate, 3)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Commission {formatRateDraft(draft.commissionRate)}%
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Referral {formatRateDraft(draft.referralCommissionRate)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/80 px-1 dark:divide-slate-700 dark:border-slate-800 dark:bg-slate-900/60 md:flex">
                      <div className="px-3 py-1.5 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">US click</p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">${formatRateDraft(draft.clickRate, 3)}</p>
                      </div>
                      <div className="px-3 py-1.5 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Commission</p>
                        <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatRateDraft(draft.commissionRate)}%</p>
                      </div>
                      <div className="px-3 py-1.5 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Referral</p>
                        <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatRateDraft(draft.referralCommissionRate)}%</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`manager-rates-${manager.id}`}
                      onClick={() => setExpandedManagerId(isExpanded ? null : manager.id)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition-[background-color,border-color,color,transform] duration-150 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {isExpanded ? 'Done' : 'Edit'}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <div
                  id={`manager-rates-${manager.id}`}
                  aria-hidden={!isExpanded}
                  inert={!isExpanded}
                  style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                    isExpanded ? 'mt-4 max-w-4xl opacity-100' : 'mt-0 max-w-4xl opacity-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                  <div className="min-w-0 border-t border-emerald-200/80 pt-3 dark:border-emerald-900/60">
                  {dirtyFieldCount > 0 && (
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">Unsaved changes</p>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setManagerDrafts((current) => ({
                            ...current,
                            [manager.id]: {
                              clickRate: String(manager.clickRate),
                              commissionRate: String(manager.commissionRate),
                              referralCommissionRate: String(manager.referralCommissionRate),
                            },
                          }))
                          const code = selectedCountryByManager[manager.id] || 'US'
                          const savedRate = manager.countryClickRates.find((rate) => rate.countryCode === code)?.rate
                          setCountryRateDrafts((current) => ({
                            ...current,
                            [manager.id]: String(savedRate ?? (code === 'US' ? manager.clickRate : 0)),
                          }))
                        }}
                        className="text-xs font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
                      >
                        Discard
                      </button>
                    </div>
                  )}
                  <form
                    onSubmit={(event) => void handleManagerRatesSubmit(event, manager.id)}
                    className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={`click-rate-${manager.id}`}
                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        US click <span className="font-normal text-slate-400">(USD)</span>
                      </label>
                      <input
                        id={`click-rate-${manager.id}`}
                        aria-label={`Click rate for ${manager.username}`}
                        type="number"
                        min="0"
                        step="0.001"
                        value={draft.clickRate}
                        onChange={(event) => updateManagerDraft(manager.id, 'clickRate', event.target.value)}
                        required
                        className={`${inputClassName} h-9 ${
                          dirtyFields.clickRate
                            ? 'border-amber-400 bg-amber-50/60 focus:border-amber-500 dark:border-amber-500/70 dark:bg-amber-500/5'
                            : ''
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <label
                        htmlFor={`commission-rate-${manager.id}`}
                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        Commission <span className="font-normal text-slate-400">(%)</span>
                      </label>
                      <input
                        id={`commission-rate-${manager.id}`}
                        aria-label={`Commission rate for ${manager.username}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={draft.commissionRate}
                        onChange={(event) => updateManagerDraft(manager.id, 'commissionRate', event.target.value)}
                        required
                        className={`${inputClassName} h-9 ${
                          dirtyFields.commissionRate
                            ? 'border-amber-400 bg-amber-50/60 focus:border-amber-500 dark:border-amber-500/70 dark:bg-amber-500/5'
                            : ''
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <label
                        htmlFor={`referral-rate-${manager.id}`}
                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        Referral <span className="font-normal text-slate-400">(%)</span>
                      </label>
                      <input
                        id={`referral-rate-${manager.id}`}
                        aria-label={`Referral commission rate for ${manager.username}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={draft.referralCommissionRate}
                        onChange={(event) => updateManagerDraft(manager.id, 'referralCommissionRate', event.target.value)}
                        required
                        className={`${inputClassName} h-9 ${
                          dirtyFields.referralCommissionRate
                            ? 'border-amber-400 bg-amber-50/60 focus:border-amber-500 dark:border-amber-500/70 dark:bg-amber-500/5'
                            : ''
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasDirtyManagerRates}
                      className={`${saveButtonClassName} h-9 px-4 text-xs font-semibold ${
                        hasDirtyManagerRates
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm hover:-translate-y-0.5 hover:border-emerald-600 hover:bg-emerald-600 hover:shadow-md active:translate-y-0'
                          : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'
                      } motion-reduce:transform-none motion-reduce:transition-none`}
                    >
                      {isSubmitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {isSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                  </form>
                  {countryRatesAvailable && (
                    <section className="mt-4 border-t border-emerald-200/80 pt-3 dark:border-emerald-900/60">
                      <form
                        onSubmit={(event) => void handleManagerCountryRateSubmit(event, manager)}
                        className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end"
                      >
                        <div className="min-w-0">
                          <label
                            htmlFor={`country-click-rate-country-${manager.id}`}
                            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            Country rate
                          </label>
                          <select
                            id={`country-click-rate-country-${manager.id}`}
                            aria-label={`Country for click rate for ${manager.username}`}
                            value={selectedCountry}
                            onChange={(event) => updateCountrySelection(manager, event.target.value)}
                            className={`${inputClassName} h-9 w-full`}
                            disabled={!countryRatesAvailable || isSubmitting}
                          >
                            {COUNTRY_OPTIONS.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.name} ({country.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-0">
                          <label
                            htmlFor={`country-click-rate-${manager.id}`}
                            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            Rate <span className="font-normal text-slate-400">(USD per click)</span>
                          </label>
                          <input
                            id={`country-click-rate-${manager.id}`}
                            aria-label={`${getCountryLabel(selectedCountry)} click rate for ${manager.username}`}
                            type="number"
                            min="0"
                            step="0.001"
                            value={countryRateDraft}
                            onChange={(event) => setCountryRateDrafts((current) => ({
                              ...current,
                              [manager.id]: event.target.value,
                            }))}
                            required
                            disabled={!countryRatesAvailable || isSubmitting}
                            className={`${inputClassName} h-9 w-full ${
                              countryRateDirty
                                ? 'border-amber-400 bg-amber-50/60 focus:border-amber-500 dark:border-amber-500/70 dark:bg-amber-500/5'
                                : ''
                            }`}
                          />
                        </div>
                        {renderRateAction(
                          manager.id,
                          'countryClickRate',
                          countryRateDirty,
                          `Save ${getCountryLabel(selectedCountry)} click rate for ${manager.username}`,
                        )}
                        {savedCountryRate > 0 && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            aria-label={`Remove ${getCountryLabel(selectedCountry)} click rate for ${manager.username}`}
                            onClick={() => void saveManagerCountryRate(manager, 0, true)}
                            className={`${saveButtonClassName} h-9 border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove rate
                          </button>
                        )}
                      </form>
                      <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {manager.countryClickRates.length
                          ? `Saved: ${manager.countryClickRates
                              .map((rate) => `${getCountryLabel(rate.countryCode)} $${Number(rate.rate).toFixed(3)}`)
                              .join(' · ')}`
                          : 'No country rates saved. Other countries default to $0.000.'}
                      </p>
                    </section>
                  )}
                  </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : managers.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">No matching managers</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try another name or username, or clear the search.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">No active managers yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Approved manager accounts will appear here when they are available.
          </p>
        </div>
      )}
    </section>
  )
}
