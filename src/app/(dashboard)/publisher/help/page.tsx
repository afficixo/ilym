'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import MessageBody from '@/components/support/MessageBody'

type Message = { id: string; body: string; createdAt: string; sender: { role: string } }
type Conversation = { id: string; messages: Message[] }

const MAX_MESSAGE_LENGTH = 5000

export default function PublisherHelpPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const transcriptRef = useRef<HTMLDivElement>(null)

  const loadConversation = async () => {
    const response = await fetch('/api/support', { credentials: 'include' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to load support messages.')
    setConversation(data.conversations[0] || null)
  }

  useEffect(() => {
    loadConversation().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load support messages.')).finally(() => setLoading(false))
    const interval = window.setInterval(() => {
      loadConversation().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load support messages.'))
    }, 2000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [conversation?.messages.length])

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }), credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send message.')
      setConversation(data.conversation)
      setBody('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 shadow-sm dark:border-white/10"><Image src="/apple-touch-icon.png" alt="Afficixo" fill sizes="40px" className="object-cover" /><span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" /></div>
            <div className="min-w-0"><h2 className="truncate text-base font-semibold leading-5 tracking-tight text-slate-800 dark:text-slate-100">Rayan</h2></div>
          </div>
        </div>
        <div ref={transcriptRef} className="h-[min(22rem,45vh)] min-h-64 space-y-3 overflow-y-auto bg-slate-50/60 px-5 py-4 dark:bg-slate-950/20">
          {loading && <div className="flex h-full items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-500" />Loading conversation...</div>}
          {!loading && !conversation && <div className="flex h-full flex-col items-center justify-center px-6 text-center"><div className="rounded-full bg-cyan-400/10 p-3 text-cyan-500 dark:text-cyan-300"><MessageCircle className="h-5 w-5" /></div><p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">How can we help?</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Send the owner a question and your conversation will appear here.</p></div>}
          {conversation?.messages.map((message, index) => {
            const isManagerMessage = message.sender.role === 'MANAGER'
            const previousMessage = conversation.messages[index - 1]
            const startsOwnerGroup = !isManagerMessage && previousMessage?.sender.role === 'MANAGER'
            const showOwnerAvatar = !isManagerMessage && (index === 0 || startsOwnerGroup)
            return <div key={message.id} className={`flex items-end gap-2 ${isManagerMessage ? 'justify-end' : 'justify-start'}`}>{!isManagerMessage && <div className={`hidden h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-white/10 sm:flex ${showOwnerAvatar ? '' : 'invisible'}`}><Image src="/apple-touch-icon.png" alt="Afficixo" width={28} height={28} className="h-full w-full object-cover" /></div>}<div className={`max-w-[88%] sm:max-w-[75%] ${isManagerMessage ? 'items-end' : 'items-start'} flex flex-col`}><div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${isManagerMessage ? 'rounded-br-md bg-cyan-500 text-slate-950 shadow-sm' : `border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200 ${showOwnerAvatar ? 'rounded-bl-md' : 'rounded-l-md'}`}`}><MessageBody body={message.body} /></div></div></div>
          })}
        </div>

        {error && <div role="alert" className="border-t border-red-500/15 bg-red-500/5 px-5 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
        <form onSubmit={sendMessage} className="border-t border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-950/50">
            <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Write a message..." aria-label="Message to owner" maxLength={MAX_MESSAGE_LENGTH} rows={2} className="min-h-[3.5rem] flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus-visible:outline-none dark:text-white dark:placeholder:text-slate-500" />
            <button type="submit" disabled={sending || !body.trim()} aria-label={sending ? 'Sending message' : 'Send message'} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"><Send className="h-4 w-4" /></button>
          </div>
        </form>
      </div>
    </section>
  )
}