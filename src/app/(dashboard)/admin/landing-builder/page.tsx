'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import AfficixoLoading from '@/components/ui/AfficixoLoading'
import {
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Globe,
  Link as LinkIcon,
  Zap,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description?: string
  thumbnail?: string
  customText?: string
  htmlContent: string
}

interface LandingPage {
  id: string
  subdomain: string
  trackingUrl: string
  userId: string
  user?: {
    id: string
    username: string
    email: string
    role: string
  }
  headline?: string
  description?: string
  imageUrl?: string
  primaryColor: string
  secondaryColor: string
  buttonText: string
  isPublished: boolean
  totalClicks: number
  template: Template
  createdAt: string
}

interface DeleteConfirmation {
  pageIds: string[]
  pages: LandingPage[]
}

const getDomain = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host.startsWith('127.')) {
      return process.env.NEXT_PUBLIC_LANDING_PAGE_DOMAIN || 'localhost:3000'
    }
    const parts = host.split('.')
    if (parts.length > 2) {
      return parts.slice(-2).join('.')
    }
    return host
  }
  return process.env.NEXT_PUBLIC_LANDING_PAGE_DOMAIN || 'afficixo.com'
}

export default function LandingPageBuilder() {
  const [currentStep, setCurrentStep] = useState<'list' | 'builder'>('list')
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [landingPageDomain, setLandingPageDomain] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [managerFilter, setManagerFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Builder form state
  const [subdomain, setSubdomain] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateIndex, setTemplateIndex] = useState(0)
  const [subdomainError, setSubdomainError] = useState('')

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setUserId(data.id)
        setUserRole(data.role)
      } else {
        setError('Failed to authenticate user')
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('Authentication error')
    }
  }, [])

  const fetchLandingPages = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await fetch('/api/landing-pages', {
        headers: { 'x-user-id': userId },
      })
      if (response.ok) {
        setLandingPages(await response.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/landing-pages/templates')
      if (response.ok) {
        const availableTemplates: Template[] = await response.json()
        setTemplates(availableTemplates)
        setTemplateIndex(0)
        setSelectedTemplate(availableTemplates[0] || null)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const selectTemplateAt = (index: number) => {
    const template = templates[index]
    if (!template) return
    setTemplateIndex(index)
    setSelectedTemplate(template)
  }

  useEffect(() => {
    setLandingPageDomain(getDomain())
    fetchCurrentUser()
    fetchTemplates()
  }, [fetchCurrentUser, fetchTemplates])

  useEffect(() => {
    if (userId) {
      fetchLandingPages()
    }
  }, [fetchLandingPages, userId])

  useEffect(() => {
    if (!deleteConfirmation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) setDeleteConfirmation(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deleteConfirmation, isDeleting])

  const validateSubdomain = async (value: string) => {
    setSubdomain(value)
    if (!value.trim()) {
      setSubdomainError('')
      return
    }

    if (landingPages.some(page => page.subdomain === value)) {
      setSubdomainError('This subdomain is already taken')
    } else if (!/^[a-z0-9-]+$/.test(value)) {
      setSubdomainError('Only lowercase letters, numbers, and hyphens allowed')
    } else if (value.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters')
    } else {
      setSubdomainError('')
    }
  }

  const createLandingPage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subdomain || !trackingUrl || !selectedTemplate || !userId) {
      setError('Please fill in all required fields')
      return
    }

    if (subdomainError) {
      setError('Please fix subdomain issues')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          subdomain,
          trackingUrl,
          templateId: selectedTemplate.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create landing page')
      }

      setSuccess('Landing page created successfully!')
      setCurrentStep('list')
      
      setSubdomain('')
      setTrackingUrl('')
      setSelectedTemplate(null)
      
      setTimeout(() => {
        fetchLandingPages()
        setSuccess('')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create landing page')
    } finally {
      setLoading(false)
    }
  }

  const copyLandingPageLink = async (
    page: LandingPage,
    domain = landingPageDomain,
    includeProtocol = false,
  ) => {
    const url = `${includeProtocol ? 'https://' : ''}${page.subdomain}.${domain}`
    const textToCopy = page.template?.customText
      ? page.template.customText.replace(/\{link\}/gi, `${url}_`)
      : url

    try {
      await navigator.clipboard.writeText(textToCopy)
      setSuccess(`Copied: ${textToCopy}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Copy failed:', err)
      setError('Failed to copy link')
      setTimeout(() => setError(''), 2000)
    }
  }

  const requestDeleteLandingPage = (id: string) => {
    const page = landingPages.find((item) => item.id === id)
    if (page) setDeleteConfirmation({ pageIds: [id], pages: [page] })
  }

  const managerGroups = landingPages.reduce<Record<string, LandingPage[]>>((groups, page) => {
    const groupName = page.user?.username || 'Unknown user'
    groups[groupName] = groups[groupName] || []
    groups[groupName].push(page)
    return groups
  }, {})
  const managerOptions = Object.entries(managerGroups)
    .map(([username, pages]) => ({ username, userId: pages[0]?.user?.id || '' }))
    .sort((left, right) => left.username.localeCompare(right.username))
  const normalizedSearch = searchFilter.trim().toLowerCase()
  const filteredPages = landingPages.filter((page) => {
    const matchesManager = managerFilter === 'all' || page.user?.id === managerFilter || page.user?.username === managerFilter
    const searchableText = [
      page.subdomain,
      page.trackingUrl,
      page.headline,
      page.description,
      page.user?.username,
      page.user?.email,
    ].filter(Boolean).join(' ').toLowerCase()
    return matchesManager && (!normalizedSearch || searchableText.includes(normalizedSearch))
  })
  const visibleGroups = filteredPages.reduce<Record<string, LandingPage[]>>((groups, page) => {
    const groupName = page.user?.username || 'Unknown user'
    groups[groupName] = groups[groupName] || []
    groups[groupName].push(page)
    return groups
  }, {})
  const visiblePageIds = filteredPages.map((page) => page.id)
  const allVisibleSelected = visiblePageIds.length > 0 && visiblePageIds.every((id) => selectedPageIds.includes(id))

  const togglePageSelection = (id: string) => {
    setSelectedPageIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id])
  }

  const toggleAllVisiblePages = () => {
    setSelectedPageIds((current) => allVisibleSelected
      ? current.filter((id) => !visiblePageIds.includes(id))
      : [...new Set([...current, ...visiblePageIds])])
  }

  const selectedPages = landingPages.filter((page) => selectedPageIds.includes(page.id))
  const canDeleteSelected = selectedPages.length > 0 && (userRole === 'OWNER' || selectedPages.every((page) => page.userId === userId))

  const copySelectedLinks = async () => {
    const links = selectedPages.map((page) => `https://${page.subdomain}.${landingPageDomain}`)
    try {
      await navigator.clipboard.writeText(links.join('\n'))
      setSuccess(`Copied ${links.length} landing page link${links.length === 1 ? '' : 's'}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to copy selected links')
    }
  }

  const requestDeleteSelectedPages = () => {
    if (canDeleteSelected) setDeleteConfirmation({ pageIds: selectedPages.map((page) => page.id), pages: selectedPages })
  }

  const deleteConfirmedPages = async () => {
    if (!deleteConfirmation || !userId) return

    setIsDeleting(true)
    try {
      const results = await Promise.all(deleteConfirmation.pageIds.map((id) => fetch(`/api/landing-pages/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      })))
      if (results.every((response) => response.ok)) {
        const deletedIds = new Set(deleteConfirmation.pageIds)
        setLandingPages((pages) => pages.filter((page) => !deletedIds.has(page.id)))
        setSelectedPageIds((ids) => ids.filter((id) => !deletedIds.has(id)))
        setSuccess(`${deleteConfirmation.pageIds.length === 1 ? 'Landing page' : `${deleteConfirmation.pageIds.length} landing pages`} deleted`)
        setTimeout(() => setSuccess(''), 3000)
        setDeleteConfirmation(null)
      } else {
        setError('Some selected pages could not be deleted')
      }
    } catch {
      setError('Failed to delete selected pages')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading && currentStep === 'list') {
    return <AfficixoLoading compact />
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 items-start justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
            <span className="min-w-0 break-words">{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {currentStep === 'list' ? (
          <>
            {/* List View Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/afficixo-logo.png"
                  alt="Afficixo"
                  width={120}
                  height={40}
                  className="h-auto w-[120px] object-contain sm:w-[140px]"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
                  <p className="text-sm text-slate-400">
                    {userRole === 'OWNER' ? 'Review landing pages created by each manager' : 'Create and manage your landing pages'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep('builder')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/25 transition-colors hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                New Page
              </button>
            </div>

            <div className="mb-6 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(160px,1fr)_auto] lg:grid-cols-4">
              <input
                type="search"
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                placeholder="Search URL, destination, creator..."
                aria-label="Search landing pages"
                className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-white outline-none placeholder:font-normal placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
              {userRole === 'OWNER' && (
                <select
                  aria-label="Filter by manager"
                  value={managerFilter}
                  onChange={(event) => setManagerFilter(event.target.value)}
                  className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                >
                  <option value="all">All managers</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.userId || manager.username} value={manager.userId || manager.username}>
                      {manager.username}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={toggleAllVisiblePages}
                disabled={visiblePageIds.length === 0}
                className="h-10 whitespace-nowrap rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-700 disabled:opacity-100 dark:text-emerald-300 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-300"
              >
                {allVisibleSelected ? 'Clear visible selection' : 'Select all visible'}
              </button>
              <div className="text-xs text-slate-500 sm:col-span-3 lg:col-span-4">
                Showing {filteredPages.length} of {landingPages.length} pages
                {selectedPageIds.length > 0 && ` | ${selectedPageIds.length} selected`}
              </div>
              {selectedPageIds.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:col-span-3 lg:col-span-4">
                  <button
                    type="button"
                    onClick={copySelectedLinks}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Copy selected links
                  </button>
                  <button
                    type="button"
                    onClick={requestDeleteSelectedPages}
                    disabled={!canDeleteSelected}
                    title={!canDeleteSelected ? 'You can only delete pages you own' : 'Delete selected pages'}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete selected
                  </button>
                </div>
              )}
              {deleteConfirmation && deleteConfirmation.pageIds.length > 1 && (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Delete {deleteConfirmation.pageIds.length} selected pages?
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80">This action cannot be undone.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmation(null)}
                      disabled={isDeleting}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={deleteConfirmedPages}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-600/20 hover:bg-amber-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isDeleting ? 'Deleting...' : 'Confirm delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Landing Pages Grid */}
            {landingPages.length === 0 || filteredPages.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-12 text-center">
                <p className="text-sm font-medium text-slate-400">
                  {landingPages.length === 0 ? 'No landing pages yet' : 'No pages match these filters'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {landingPages.length === 0 ? 'Create your first landing page to get started.' : 'Try changing the search or filter options.'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(visibleGroups).map(([groupName, pages]) => (
                  <section key={groupName}>
                    {userRole === 'OWNER' && (
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">
                        {groupName}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pages.map((page) => (
                        <div
                          key={page.id}
                          className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                    {/* Subdomain & Copy URL */}
                    <div className="mb-3 min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={selectedPageIds.includes(page.id)}
                              onChange={() => togglePageSelection(page.id)}
                              className="h-4 w-4 accent-cyan-500"
                              aria-label={`Select ${page.subdomain}`}
                            />
                          </label>
                          <p className="text-xs font-medium text-slate-500">Landing URLs</p>
                        </div>
                        {(page.userId === userId || userRole === 'OWNER') && (
                          <button
                            type="button"
                            onClick={() => requestDeleteLandingPage(page.id)}
                            className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-amber-600 transition-colors hover:bg-amber-500/10 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:text-amber-300 dark:hover:text-amber-200"
                            aria-label={`Delete ${page.subdomain}`}
                            title="Delete landing page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2 py-1">
                          <h3
                            className="min-w-0 flex-1 truncate font-mono text-sm text-emerald-600 dark:text-emerald-400"
                            title={`https://${page.subdomain}.afficix.com`}
                          >
                            {page.subdomain}.afficix.com
                          </h3>
                          <button
                            type="button"
                            onClick={() => copyLandingPageLink(page, 'afficix.com')}
                            className="flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                            aria-label={`Copy URL for ${page.subdomain}`}
                            title="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2 py-1">
                          <p
                            className="min-w-0 flex-1 truncate font-mono text-sm text-green-800 dark:text-green-300"
                            title={`https://${page.subdomain}.weebly.pro`}
                          >
                            {page.subdomain}.weebly.pro
                          </p>
                          <button
                            type="button"
                            onClick={() => copyLandingPageLink(page, 'weebly.pro', true)}
                            className="flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                            aria-label={`Copy Weebly URL for ${page.subdomain}`}
                            title="Copy Weebly URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tracking & Views */}
                    <div className="mb-3 flex-1 border-t border-slate-800 pt-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-3">
                      <div className="min-w-0">
                        <p className="mb-0.5 text-xs text-slate-500">Redirects to</p>
                        <p className="truncate font-mono text-xs text-slate-300" title={page.trackingUrl}>
                          {page.trackingUrl}
                        </p>
                      </div>
                      <div className="border-l border-slate-800 pl-3 text-left">
                        <p className="mb-0.5 text-xs text-slate-500">Views</p>
                        <p className="text-sm font-semibold text-white">{page.totalClicks}</p>
                      </div>
                      </div>
                    </div>

                          {deleteConfirmation?.pageIds.length === 1 && deleteConfirmation.pageIds[0] === page.id && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Delete this landing page?</p>
                                  <p className="mt-0.5 truncate text-[11px] text-amber-700/80 dark:text-amber-300/80">This cannot be undone.</p>
                                </div>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmation(null)}
                                  disabled={isDeleting}
                                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={deleteConfirmedPages}
                                  disabled={isDeleting}
                                  className="flex-1 rounded-md bg-amber-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm shadow-amber-600/20 hover:bg-amber-700 disabled:opacity-60"
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm delete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Builder View */}
            <div className="mb-8 flex flex-wrap items-start gap-4 border-b border-slate-800 pb-5">
              <button
                onClick={() => setCurrentStep('list')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                aria-label="Back to landing pages"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">New landing page</h1>
                <p className="mt-1 text-sm text-slate-400">Choose a URL, destination, and template for your page.</p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl">
              <form onSubmit={createLandingPage} className="flex flex-col space-y-6">
                {/* Step 1 */}
                <div className="order-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
                      <h3 className="truncate text-lg font-semibold text-white">Basic Information</h3>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !selectedTemplate}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/25 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">Subdomain *</label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => validateSubdomain(e.target.value)}
                          placeholder="your-campaign"
                          className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      {subdomainError && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                          <X className="h-3 w-3" /> {subdomainError}
                        </p>
                      )}
                      {!subdomainError && subdomain && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="h-3 w-3" /> Looks good!
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">Tracking Link *</label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
                        <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                        <input
                          type="url"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          placeholder="https://example.com/offer"
                          required
                          className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="order-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-white">Choose a template</h3>
                  </div>

                  {templates.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      No templates available. Contact your administrator.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">
                        Use the arrows to browse and change the template.
                      </p>
                      <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1.5">
                        <button
                          type="button"
                          aria-label="Previous template"
                          disabled={templates.length <= 1}
                          onClick={() => selectTemplateAt((templateIndex - 1 + templates.length) % templates.length)}
                          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-28 text-center text-xs font-medium text-slate-300">
                          Template {templateIndex + 1} of {templates.length}
                        </span>
                        <button
                          type="button"
                          aria-label="Next template"
                          disabled={templates.length <= 1}
                          onClick={() => selectTemplateAt((templateIndex + 1) % templates.length)}
                          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      {(() => {
                        const template = templates[templateIndex]
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => selectTemplateAt(templateIndex)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-left transition-colors hover:border-slate-600 hover:bg-slate-800"
                          >
                            {template.thumbnail && (
                              <Image
                                src={template.thumbnail}
                                alt={template.name}
                                width={400}
                                height={96}
                                className="mb-3 h-48 w-full rounded-md bg-slate-950/40 object-contain"
                              />
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="break-words text-sm font-medium text-white">{template.name}</h4>
                                {template.description && (
                                  <p
                                    onPointerDown={(event) => event.stopPropagation()}
                                    className="mt-2 cursor-text select-text break-words rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs font-medium leading-5 text-amber-200"
                                  >
                                    {template.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })()}
                    </div>
                  )}
                </div>

              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}