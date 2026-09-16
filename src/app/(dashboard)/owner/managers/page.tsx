'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock3,
  CheckCircle2,
  ShieldCheck,
  Search,
  UserX,
  Trash2,
  Loader2,
  X,
  Inbox,
} from 'lucide-react'

type ManagerUser = {
  id: string
  username: string
  fullName: string | null
  address: string | null
  email: string
  source: string | null
  contractNumber: string | null
  telegramUsername: string | null
  bkashNumber: string | null
  role: string
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REJECTED'
  createdAt: string
  updatedAt: string
  lastLogin: string | null
}

type ConfirmDialogState = {
  id: string
  title: string
  message: string
  confirmLabel: string
}

type Toast = {
  id: number
  type: 'success' | 'error'
  message: string
}

const statusStyles: Record<ManagerUser['status'], string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  DISABLED: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
}

const statusLabels: Record<ManagerUser['status'], string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  DISABLED: 'Disabled',
  REJECTED: 'Rejected',
}

const statusFilters: Array<{ label: string; value: 'ALL' | ManagerUser['status'] }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Disabled', value: 'DISABLED' },
  { label: 'Rejected', value: 'REJECTED' },
]

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-slate-200">{value}</div>
    </div>
  )
}

function ActionButtons({
  manager,
  isActionLoading,
  updateStatus,
  openDeleteConfirm,
  mobile = false,
}: {
  manager: ManagerUser
  isActionLoading: boolean
  updateStatus: (id: string, status: ManagerUser['status']) => void
  openDeleteConfirm: (manager: ManagerUser) => void
  mobile?: boolean
}) {
  const buttonBase = mobile
    ? 'min-h-10 rounded-lg px-3 text-xs'
    : 'rounded-lg px-2.5 py-1.5 text-xs'

  return (
    <div className="ml-auto grid w-full max-w-[190px] grid-cols-2 gap-2">
      {manager.status !== 'ACTIVE' && (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => updateStatus(manager.id, 'ACTIVE')}
          className={`inline-flex min-w-0 w-full items-center justify-center gap-1.5 border border-cyan-400/25 bg-cyan-400/10 font-medium text-cyan-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-wait disabled:opacity-60 ${buttonBase}`}
        >
          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Approve
        </button>
      )}

      {manager.status !== 'DISABLED' && manager.status !== 'REJECTED' && (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => updateStatus(manager.id, 'DISABLED')}
          className={`inline-flex min-w-0 w-full items-center justify-center gap-1.5 border border-slate-600 bg-slate-800/70 font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 ${buttonBase}`}
        >
          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
          Disable
        </button>
      )}

      {manager.status !== 'PENDING' && manager.status !== 'REJECTED' && (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => updateStatus(manager.id, 'PENDING')}
          className={`inline-flex min-w-0 w-full items-center justify-center gap-1.5 border border-amber-400/25 bg-amber-400/10 font-medium text-amber-300 transition hover:border-amber-300/40 hover:bg-amber-400/15 disabled:cursor-wait disabled:opacity-60 ${buttonBase}`}
        >
          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Pending
        </button>
      )}

      {manager.status !== 'REJECTED' && (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => updateStatus(manager.id, 'REJECTED')}
          className={`inline-flex min-w-0 w-full items-center justify-center gap-1.5 border border-rose-400/25 bg-rose-400/10 font-medium text-rose-300 transition hover:border-rose-300/40 hover:bg-rose-400/15 disabled:cursor-wait disabled:opacity-60 ${buttonBase}`}
        >
          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Reject
        </button>
      )}

      <button
        type="button"
        disabled={isActionLoading}
        onClick={() => openDeleteConfirm(manager)}
        className={`inline-flex min-w-0 w-full items-center justify-center gap-1.5 border border-slate-700 bg-slate-800/40 font-medium text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-wait disabled:opacity-60 ${buttonBase}`}
      >
        {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete
      </button>
    </div>
  )
}

export default function OwnerManagersPage() {
  const router = useRouter()
  const [managers, setManagers] = useState<ManagerUser[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ManagerUser['status']>('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const toastIdRef = useRef(0)

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 4000))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissToast])

  const summary = useMemo(
    () => ({
      total: managers.length,
      pending: managers.filter((manager) => manager.status === 'PENDING').length,
      active: managers.filter((manager) => manager.status === 'ACTIVE').length,
      disabled: managers.filter((manager) => manager.status === 'DISABLED').length,
      rejected: managers.filter((manager) => manager.status === 'REJECTED').length,
    }),
    [managers],
  )

  const filteredManagers = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filteredByStatus =
      statusFilter === 'ALL' ? managers : managers.filter((manager) => manager.status === statusFilter)

    if (!term) return filteredByStatus

    return filteredByStatus.filter(
      (manager) =>
        manager.username.toLowerCase().includes(term) ||
        manager.email.toLowerCase().includes(term) ||
        (manager.fullName?.toLowerCase().includes(term) ?? false) ||
        (manager.source?.toLowerCase().includes(term) ?? false) ||
        (manager.contractNumber?.toLowerCase().includes(term) ?? false) ||
        (manager.telegramUsername?.toLowerCase().includes(term) ?? false) ||
        (manager.bkashNumber?.toLowerCase().includes(term) ?? false),
    )
  }, [managers, search, statusFilter])

  const loadManagers = useCallback(
    async (silent = false) => {
      try {
        if (silent) setRefreshing(true)
        else setLoading(true)

        const response = await fetch('/api/owner/managers', { credentials: 'include' })

        if (response.status === 401 || response.status === 403) {
          router.push('/login')
          return
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          let data: { error?: string } = {}

          try {
            data = JSON.parse(text)
          } catch {
            // ignore invalid JSON body
          }

          pushToast('error', data.error || text || 'Unable to load manager accounts.')
          return
        }

        const data = await response.json()
        setManagers(data.managers || [])
      } catch {
        pushToast('error', 'Unable to load manager accounts. Please check your connection.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [router, pushToast],
  )

  useEffect(() => {
    void loadManagers(false)
  }, [loadManagers])

  const updateStatus = async (id: string, status: ManagerUser['status']) => {
    try {
      setActionLoadingId(id)

      const response = await fetch(`/api/owner/managers/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.status === 401 || response.status === 403) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to update manager.' }))
        throw new Error(data.error || 'Failed to update manager.')
      }

      setManagers((current) =>
        current.map((manager) =>
          manager.id === id ? { ...manager, status, updatedAt: new Date().toISOString() } : manager,
        ),
      )
      pushToast('success', `Manager status updated to ${statusLabels[status]}.`)
    } catch (err: any) {
      pushToast('error', err.message || 'Failed to update manager status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const performDelete = async (id: string) => {
    try {
      setActionLoadingId(id)

      const response = await fetch(`/api/owner/managers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.status === 401 || response.status === 403) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unable to delete manager.' }))
        throw new Error(data.error || 'Unable to delete manager.')
      }

      setManagers((current) => current.filter((manager) => manager.id !== id))
      pushToast('success', 'Manager account deleted successfully.')
    } catch (err: any) {
      pushToast('error', err.message || 'Failed to delete manager account.')
    } finally {
      setActionLoadingId(null)
      setConfirmDialog(null)
    }
  }

  const openDeleteConfirm = (manager: ManagerUser) => {
    setConfirmDialog({
      id: manager.id,
      title: `Delete ${manager.username}?`,
      message: `This will permanently remove the manager account for ${manager.email}. This action cannot be undone.`,
      confirmLabel: 'Delete manager',
    })
  }

  const statCards = [
    {
      label: 'Total managers',
      value: summary.total,
      icon: ShieldCheck,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Pending review',
      value: summary.pending,
      icon: Clock3,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Active',
      value: summary.active,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Inactive',
      value: summary.disabled + summary.rejected,
      icon: UserX,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-slate-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                  </div>
                  <div className={`rounded-lg ${item.bg} p-2`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search & Filters */}
        <div className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Search managers by username, email, or Telegram"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, email, or Telegram..."
                className="w-full rounded-lg border-0 bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                  aria-label="Clear manager search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((filter) => {
                const count =
                  filter.value === 'ALL'
                    ? summary.total
                    : summary[filter.value.toLowerCase() as 'pending' | 'active' | 'disabled' | 'rejected']
                const isActive = statusFilter === filter.value
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {filter.label}
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
              <span className="text-slate-400">Showing {filteredManagers.length} of {managers.length}</span>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-800 md:block">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-800/50 text-xs font-medium uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="w-[190px] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Inbox className="h-8 w-8 text-slate-600" />
                        <p className="mt-2 text-sm font-medium text-slate-300">No managers found</p>
                        <p className="text-xs text-slate-500">
                          {search ? `No results for "${search}"` : 'No managers in this category'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((manager) => {
                    const isActionLoading = actionLoadingId === manager.id
                    return (
                      <tr key={manager.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="w-[190px] px-4 py-3 align-top">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                              {manager.username.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white">{manager.username}</div>
                              <div className="text-xs text-slate-500">{manager.fullName ?? 'No name'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          <div className="truncate text-slate-300">{manager.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-xs">
                            <div><span className="text-slate-500">Contract:</span> <span className="text-slate-300">{manager.contractNumber ?? '-'}</span></div>
                            <div>
                              <span className="text-slate-500">Telegram:</span>{' '}
                              <span className="text-slate-300">{manager.telegramUsername ? `@${manager.telegramUsername.replace(/^@/, '')}` : '-'}</span>
                            </div>
                            <div><span className="text-slate-500">Address:</span> <span className="text-slate-300">{manager.address ?? '-'}</span></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[manager.status]}`}>
                            {statusLabels[manager.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons
                            manager={manager}
                            isActionLoading={isActionLoading}
                            updateStatus={updateStatus}
                            openDeleteConfirm={openDeleteConfirm}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-4 md:hidden">
          {filteredManagers.length === 0 ? (
            <div className="rounded-xl bg-slate-900 p-8 text-center ring-1 ring-slate-800">
              <Inbox className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 font-medium text-slate-300">No managers found</p>
              <p className="text-sm text-slate-500">
                {search ? `No results for "${search}"` : 'No managers to display'}
              </p>
            </div>
          ) : (
            filteredManagers.map((manager) => {
              const isActionLoading = actionLoadingId === manager.id
              return (
                <div key={manager.id} className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400">
                      {manager.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-white">{manager.username}</h3>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[manager.status]}`}>
                          {statusLabels[manager.status]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{manager.email}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoItem label="Full name" value={manager.fullName ?? '—'} />
                    <InfoItem label="Address" value={manager.address ?? '—'} />
                    <InfoItem label="Source" value={manager.source ?? '—'} />
                    <InfoItem label="Contract" value={manager.contractNumber ?? '—'} />
                    <InfoItem
                      label="Telegram"
                      value={manager.telegramUsername ? `@${manager.telegramUsername.replace(/^@/, '')}` : '—'}
                    />
                    <InfoItem label="Created" value={new Date(manager.createdAt).toLocaleDateString()} />
                  </div>

                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <ActionButtons
                      manager={manager}
                      isActionLoading={isActionLoading}
                      updateStatus={updateStatus}
                      openDeleteConfirm={openDeleteConfirm}
                      mobile
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 shadow-lg ring-1 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-400 ring-emerald-500/30'
                : 'bg-red-950 text-red-400 ring-red-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 hover:bg-white/5"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 p-5 shadow-xl ring-1 ring-slate-800">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/10 p-2">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{confirmDialog.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{confirmDialog.message}</p>
              </div>
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => performDelete(confirmDialog.id)}
                disabled={actionLoadingId === confirmDialog.id}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
              >
                {actionLoadingId === confirmDialog.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  confirmDialog.confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}