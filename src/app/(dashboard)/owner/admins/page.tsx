'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RefreshCw, Search, Shield, UserX } from 'lucide-react'

type AdminUser = {
  id: string
  username: string
  email: string
  fullName: string | null
  status: 'ACTIVE' | 'DISABLED' | 'PENDING' | 'REJECTED'
  createdAt: string
  lastLogin: string | null
}

export default function OwnerAdminsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadAdmins = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const response = await fetch('/api/owner/admins', { credentials: 'include', cache: 'no-store' })
      if (response.status === 401 || response.status === 403) {
        router.push('/login')
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load admin users.')
      setAdmins(data.admins || [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load admin users.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    void loadAdmins()
  }, [loadAdmins])

  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return admins
    return admins.filter((admin) => [admin.username, admin.email, admin.fullName].filter(Boolean).some((value) => value!.toLowerCase().includes(term)))
  }, [admins, search])

  const updateStatus = async (admin: AdminUser) => {
    const status = admin.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    setUpdatingId(admin.id)
    try {
      const response = await fetch(`/api/owner/admins/${admin.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update admin user.')
      setAdmins((current) => current.map((item) => item.id === admin.id ? { ...item, status } : item))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update admin user.')
    } finally {
      setUpdatingId(null)
    }
  }

  const activeCount = admins.filter((admin) => admin.status === 'ACTIVE').length

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading admin users...</div>

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Shield className="h-5 w-5 text-cyan-500" /><h1 className="text-xl font-semibold">Manage Admins</h1></div>
          <p className="mt-1 text-sm text-slate-500">Manage access for administrator accounts.</p>
        </div>
        <button type="button" onClick={() => void loadAdmins(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-xs text-slate-500">Active admins</p><p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"><p className="text-xs text-slate-500">Total admins</p><p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{admins.length}</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search admin users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by username, name, or email" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white" /></div>
        {error && <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {filteredAdmins.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No admin users found.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{filteredAdmins.map((admin) => <div key={admin.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-white">{admin.fullName || admin.username}</p><p className="truncate text-sm text-slate-500">@{admin.username} · {admin.email}</p><p className="mt-1 text-xs text-slate-400">Last login: {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}</p></div><button type="button" onClick={() => void updateStatus(admin)} disabled={updatingId === admin.id} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60 ${admin.status === 'ACTIVE' ? 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>{updatingId === admin.id ? <Loader2 className="h-4 w-4 animate-spin" /> : admin.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{admin.status === 'ACTIVE' ? 'Disable' : 'Activate'}</button></div>)}</div>}
      </div>
    </section>
  )
}