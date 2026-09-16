'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Megaphone, MessageCircle, Search, Send, Trash2, X } from 'lucide-react'
import MessageBody from '@/components/support/MessageBody'

type Message = { id: string; body: string; sender: { username: string; role: string } }
type User = { id: string; username: string; fullName: string | null; email: string; status: string }
type Conversation = { id: string; status: 'OPEN' | 'RESOLVED'; manager: { id: string; username: string; fullName: string | null; email: string }; messages: Message[] }
type SupportFilter = 'ALL' | 'NEW' | 'OPEN' | 'RESOLVED'

export default function OwnerSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [bulkAction, setBulkAction] = useState<'resolve' | 'delete' | null>(null)
  const [body, setBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [supportFilter, setSupportFilter] = useState<SupportFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const transcriptRef = useRef<HTMLDivElement>(null)
  const selectedConversation = conversations.find((item) => item.manager.id === selectedId)
  const selectedUser = users.find((item) => item.id === selectedId)
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredUsers = users.filter((user) => {
    if (user.status !== 'ACTIVE') return false
    const conversation = conversations.find((item) => item.manager.id === user.id)
    const status = conversation?.status || 'NEW'
    const matchesFilter = supportFilter === 'ALL' || status === supportFilter
    const matchesSearch = [user.fullName, user.username, user.email].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearchQuery))
    return matchesFilter && matchesSearch
  })

  useEffect(() => {
    let active = true

    const refreshSupport = async () => {
      try {
        const response = await fetch('/api/support', { credentials: 'include', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!active) return
        setConversations(data.conversations)
        setUsers(data.users || [])
        setError('')
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load support.')
      } finally {
        if (active) setLoading(false)
      }
    }

    refreshSupport()
    const interval = window.setInterval(refreshSupport, 2000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [selectedConversation?.id, selectedConversation?.messages.length])

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if ((!selectedUser && users.length === 0) || !body.trim()) return
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedUser ? { conversationId: selectedConversation?.id, managerId: selectedUser.id, body } : { broadcast: true, body }), credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (selectedUser) {
        setConversations((items) => items.some((item) => item.id === data.conversation.id) ? items.map((item) => item.id === data.conversation.id ? data.conversation : item) : [data.conversation, ...items])
      } else {
        setConversations((items) => {
          const updated = new Map<string, Conversation>(data.conversations.map((conversation: Conversation) => [conversation.id, conversation]))
          return [...updated.values(), ...items.filter((conversation) => !updated.has(conversation.id))]
        })
      }
      setBody('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const resolve = async () => {
    if (!selectedConversation) return
    const response = await fetch('/api/support', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selectedConversation.id, status: 'RESOLVED' }), credentials: 'include' })
    const data = await response.json()
    if (response.ok) setConversations((items) => items.map((item) => item.id === data.conversation.id ? data.conversation : item))
  }

  const resolveAll = async () => {
    if (!conversations.length) return
    const response = await fetch('/api/support', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'RESOLVE_ALL' }), credentials: 'include' })
    if (response.ok) setConversations((items) => items.map((item) => ({ ...item, status: 'RESOLVED' })))
  }

  const deleteAll = async () => {
    if (!conversations.length) return
    const response = await fetch('/api/support', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'DELETE_ALL' }), credentials: 'include' })
    if (response.ok) {
      setConversations([])
      setSelectedId(null)
      setShowBroadcast(false)
    }
  }

  const confirmBulkAction = async () => {
    const action = bulkAction
    setBulkAction(null)
    if (action === 'resolve') await resolveAll()
    if (action === 'delete') await deleteAll()
  }

  const deleteConversation = async () => {
    if (!selectedConversation || !window.confirm('Delete this conversation and all its messages?')) return
    setError('')
    const response = await fetch('/api/support', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selectedConversation.id }), credentials: 'include' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Unable to delete conversation.')
      return
    }
    setConversations((items) => items.filter((item) => item.id !== data.deletedConversationId))
    setSelectedId(null)
  }

  return (
    <section className="flex h-[calc(100dvh-1.5rem)] min-h-0 flex-col space-y-3 lg:h-[calc(100dvh-3rem)] lg:space-y-5">
      <div className="grid min-h-0 flex-1 grid-rows-1 gap-3 lg:grid-cols-[18rem_1fr] lg:gap-4 lg:grid-rows-1">
        <div className={`h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:shadow-none ${selectedUser || showBroadcast ? 'hidden lg:block' : ''}`}>
          {loading && <div className="p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading...</div>}
          {!loading && users.length === 0 && <p className="p-4 text-sm text-slate-500">No users yet.</p>}
          {!loading && users.length > 0 && <>
            <label className="relative mb-2 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search publishers..." aria-label="Search publishers" className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white" /></label>
            <div className="mb-2 grid grid-cols-4 gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-white/5" aria-label="Filter conversations" role="group">
              {(['ALL', 'NEW', 'OPEN', 'RESOLVED'] as const).map((filter) => {
                const label = filter === 'ALL' ? 'All' : filter[0] + filter.slice(1).toLowerCase()
                return <button key={filter} type="button" aria-pressed={supportFilter === filter} onClick={() => setSupportFilter(filter)} className={`rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition-colors ${supportFilter === filter ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>{label}</button>
              })}
            </div>
            <div className="mb-2 flex items-center gap-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
              <button type="button" onClick={() => setBulkAction('resolve')} disabled={!conversations.length} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 px-2 py-1.5 text-[10px] font-medium text-emerald-600 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400" title="Resolve all conversations"><Check className="h-3 w-3" />Resolve all</button>
              <button type="button" onClick={() => setBulkAction('delete')} disabled={!conversations.length} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 px-2 py-1.5 text-[10px] font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400" title="Delete all conversations"><Trash2 className="h-3 w-3" />Delete all</button>
            </div>
            {bulkAction && <div className={`mb-2 rounded-xl border p-3 ${bulkAction === 'delete' ? 'border-rose-500/25 bg-rose-500/10' : 'border-emerald-500/25 bg-emerald-500/10'}`} role="alertdialog" aria-label={`${bulkAction === 'delete' ? 'Delete' : 'Resolve'} all conversations confirmation`}>
              <p className={`text-xs font-semibold ${bulkAction === 'delete' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{bulkAction === 'delete' ? 'Delete all conversations?' : 'Resolve all conversations?'}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{bulkAction === 'delete' ? 'This permanently removes every conversation and message.' : 'This will mark every conversation as resolved.'}</p>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setBulkAction(null)} className="rounded-md px-2.5 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-white/10 hover:text-slate-800 dark:hover:text-white">Cancel</button>
                <button type="button" onClick={() => void confirmBulkAction()} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-white ${bulkAction === 'delete' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>Confirm</button>
              </div>
            </div>}
          </>}
          {!loading && users.length > 0 && filteredUsers.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500">No publishers match your search or filter.</p>}
          <button type="button" onClick={() => setShowBroadcast(true)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-left transition-colors hover:bg-cyan-400/15"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-400"><Megaphone className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Broadcast</span><span className="block truncate text-xs text-slate-500">Message all active publishers</span></span></button>
          <div className="space-y-1">{filteredUsers.map((user) => { const conversation = conversations.find((item) => item.manager.id === user.id); return <button key={user.id} type="button" onClick={() => { setShowBroadcast(false); setSelectedId(user.id) }} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedUser?.id === user.id ? 'border-cyan-400/20 bg-cyan-400/10 shadow-sm dark:border-cyan-300/15' : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-white/5'}`}><div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-800 dark:text-slate-100"><span className="truncate">{user.fullName || 'Name not provided'}</span><span className={`shrink-0 text-[10px] uppercase ${conversation?.status === 'OPEN' ? 'text-amber-500' : conversation ? 'text-emerald-500' : 'text-slate-400'}`}>{conversation?.status || 'NEW'}</span></div><p className="mt-0.5 truncate text-xs text-slate-500">@{user.username}</p><p className="mt-1 truncate text-xs text-slate-400">{conversation?.messages.at(-1)?.body || 'Start a conversation'}</p></button> })}</div>
        </div>
        {selectedUser && !showBroadcast ? <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:shadow-none">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-3 py-3 sm:px-4 dark:border-white/10"><div className="min-w-0"><div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-800 dark:text-white"><MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" /><span className="truncate">{selectedUser.fullName || 'Name not provided'}</span></div><p className="truncate text-xs text-slate-500">@{selectedUser.username} · {selectedUser.email}</p></div><div className="flex shrink-0 items-center gap-2">{selectedConversation?.status === 'OPEN' && <button type="button" onClick={resolve} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-500 hover:bg-emerald-500/10 sm:px-3"><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">Resolve</span></button>}{selectedConversation && <button type="button" onClick={deleteConversation} aria-label="Delete conversation" title="Delete conversation" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-white/10 dark:text-slate-500 dark:hover:border-rose-400/30 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>}<button type="button" onClick={() => setSelectedId(null)} aria-label="Close conversation" title="Close conversation" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"><X className="h-4 w-4" /></button></div></div>
            <div ref={transcriptRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/20">{selectedConversation?.messages.map((message) => <div key={message.id} className={`w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-5 shadow-sm ${message.sender.role === 'OWNER' ? 'ml-auto rounded-br-sm bg-cyan-500 text-slate-950' : 'rounded-bl-sm border border-slate-200/70 bg-white text-slate-700 dark:border-white/5 dark:bg-slate-800 dark:text-slate-200'}`}><MessageBody body={message.body} /></div>)}</div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200/70 bg-white/60 p-3 sm:p-4 dark:border-white/10 dark:bg-slate-900/30"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reply to publisher..." className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-white" /><button type="submit" disabled={sending || !body.trim()} aria-label="Send reply" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button></form>
          {error && <p className="px-4 pb-4 text-sm text-red-500">{error}</p>}
        </div> : <div className={`${showBroadcast ? 'flex' : 'hidden lg:flex'} relative min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:shadow-none`}>
          {showBroadcast && <button type="button" onClick={() => setShowBroadcast(false)} className="absolute left-3 top-3 z-10 inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300"><X className="h-3.5 w-3.5" />Back</button>}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400"><MessageCircle className="h-6 w-6" /></div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500">Broadcast mode</p>
            <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">Message all publishers</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Send an announcement to every publisher without opening an individual conversation.</p>
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200/70 bg-white/60 p-3 sm:p-4 dark:border-white/10 dark:bg-slate-900/30"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message all publishers..." className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-white" /><button type="submit" disabled={sending || !body.trim() || users.length === 0} aria-label="Send message to all publishers" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button></form>
          {error && <p className="px-4 pb-4 text-sm text-red-500">{error}</p>}
        </div>}
      </div>
    </section>
  )
}