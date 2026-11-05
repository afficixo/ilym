'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Gift, UsersRound, WalletCards } from 'lucide-react'

type ReferralActivityItem = {
  id: string
  amount: number
  publisherPayoutAmount: number
  createdAt: string
  paidAt: string | null
  status: 'paid' | 'pending' | 'estimated'
  referredUser: { username: string }
  invoice: { invoiceNumber: string }
}

type ReferralData = {
  referralCode: string | null
  commissionRate: number
  referredPublishers: Array<{
    id: string
    username: string
    createdAt: string
    status: string
  }>
  commissions: ReferralActivityItem[]
  pendingEstimates: Array<Omit<ReferralActivityItem, 'paidAt' | 'status'>>
  summary: {
    referrals: number
    pendingAmount: number
    pendingRecordedAmount: number
    pendingEstimateAmount: number
    paidAmount: number
    totalAmount: number
  }
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatMoney(amount: number) {
  return money.format(amount)
}

function formatDate(value: string) {
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? '—' : date.format(parsedDate)
}

export default function PublisherReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [copyMessage, setCopyMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    const loadReferrals = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/referrals', { credentials: 'include', cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load referrals.')
        if (active) {
          setData(result)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load referrals.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadReferrals()
    return () => { active = false }
  }, [reloadKey])

  const referralLink = data?.referralCode
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(data.referralCode)}`
    : ''

  const copyReferralLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setCopyMessage('Referral link copied to clipboard.')
      window.setTimeout(() => setCopied(false), 1800)
    } catch (copyError) {
      console.error('Copy referral link failed:', copyError)
      setCopied(false)
      setCopyMessage('Unable to copy the link. Select and copy it manually.')
    }
  }

  const stats = [
    {
      label: 'Publishers invited',
      value: data?.summary.referrals.toLocaleString() ?? '—',
      detail: 'Joined with your link',
      icon: UsersRound,
      tone: 'text-sky-600 dark:text-sky-300',
    },
    {
      label: 'Pending commission',
      value: data ? formatMoney(data.summary.pendingAmount) : '—',
      detail: data?.summary.pendingEstimateAmount
        ? `Includes ${formatMoney(data.summary.pendingEstimateAmount)} estimated on unpaid invoices`
        : 'Awaiting owner payout',
      icon: WalletCards,
      tone: 'text-amber-600 dark:text-amber-300',
    },
    {
      label: 'Commission paid',
      value: data ? formatMoney(data.summary.paidAmount) : '—',
      detail: 'Included in past payouts',
      icon: Check,
      tone: 'text-emerald-600 dark:text-emerald-300',
    },
    {
      label: 'Lifetime commission',
      value: data ? formatMoney(data.summary.totalAmount) : '—',
      detail: 'Total referral earnings',
      icon: Gift,
      tone: 'text-violet-600 dark:text-violet-300',
    },
  ]
  const commissionActivity: ReferralActivityItem[] = data
    ? [
      ...data.commissions,
      ...data.pendingEstimates.map((estimate) => ({
        ...estimate,
        paidAt: null,
        status: 'estimated' as const,
      })),
    ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    : []

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#359f25] dark:text-[#a2fa8e]">
            Publisher program
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Referral program
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Invite publishers to Afficix and earn a share of their eligible payouts.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#359f25]/20 bg-[#359f25]/[0.07] px-3 py-1.5 text-sm font-semibold text-[#24651d] dark:border-[#5ff442]/20 dark:bg-[#5ff442]/[0.08] dark:text-[#a2fa8e]">
          <Gift className="h-4 w-4" aria-hidden="true" />
          {data ? `${data.commissionRate}% reward rate` : 'Reward rate'}
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#202b2f]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5ff442]/15 text-[#24651d] dark:text-[#a2fa8e]">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">Your personal invite link</h2>
                <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                  Share it with someone who would be a great fit for the publisher network.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                aria-label="Your referral link"
                value={referralLink}
                placeholder={isLoading ? 'Loading your referral link…' : referralLink ? '' : 'Referral link unavailable'}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#359f25] focus:ring-2 focus:ring-[#359f25]/15 dark:border-white/10 dark:bg-[#192326] dark:text-slate-200"
              />
              <button
                type="button"
                onClick={copyReferralLink}
                disabled={!referralLink}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#5ff442] px-4 text-sm font-semibold text-[#263238] transition hover:bg-[#4dd935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy invite link'}
              </button>
            </div>
            {copyMessage && (
              <p role="status" aria-live="polite" className={`mt-2 text-xs ${copied ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {copyMessage}
              </p>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-[#192326]/70 lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">How it works</p>
            <ol className="mt-4 space-y-4">
              {[
                ['01', 'Share your invite link'],
                ['02', 'They join as a publisher'],
                ['03', 'Earn when their payout is recorded'],
              ].map(([step, label]) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-[#202b2f] dark:text-slate-300">
                    {step}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-[var(--text-secondary)] dark:border-white/10">
              Pending estimates are based on unpaid invoices. The final commission is recorded when the owner records the manager payout.
            </p>
          </aside>
        </div>
      </section>

      <section aria-label="Referral summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#202b2f] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{stat.label}</span>
                <Icon className={`h-[18px] w-[18px] shrink-0 ${stat.tone}`} aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{stat.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#202b2f]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Commission activity</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Track recorded commissions and estimates on unpaid invoices.</p>
          </div>
          {data && commissionActivity.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {commissionActivity.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5" aria-label="Loading commission activity">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.04]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Commission activity could not be loaded.</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:border-white/10 dark:hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </div>
        ) : !data || commissionActivity.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {data?.summary.referrals ? 'No commission activity yet' : 'Your referrals start here'}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-[var(--text-secondary)]">
              {data?.summary.referrals
                ? 'Pending estimates appear when referred publishers have unpaid invoices. Recorded commissions appear when their payout is recorded.'
                : 'Share your invite link. Estimates appear when referred publishers have unpaid invoices, and the final commission is recorded with their payout.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#192326] dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3">Publisher</th>
                  <th scope="col" className="px-5 py-3">Date</th>
                  <th scope="col" className="px-5 py-3 text-right">Payout amount</th>
                  <th scope="col" className="px-5 py-3 text-right">Your commission</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {commissionActivity.map((commission) => (
                  <tr key={commission.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.025]">
                    <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">
                          {commission.referredUser.username.slice(0, 1)}
                        </span>
                        {commission.referredUser.username}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--text-secondary)]">
                      {formatDate(commission.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatMoney(commission.publisherPayoutAmount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatMoney(commission.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${commission.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${commission.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                        {commission.status === 'paid'
                          ? 'Paid'
                          : commission.status === 'estimated'
                            ? 'Estimated'
                            : 'Pending payout'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
