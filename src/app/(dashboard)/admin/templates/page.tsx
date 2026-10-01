'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, X, ArrowLeft, Image as ImageIcon, Check, Globe } from 'lucide-react'
import AfficixoLoading from '@/components/ui/AfficixoLoading'
import {
  DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS,
  type LandingPageDomainSetting,
} from '@/lib/utils/landing-page-host'

interface Template {
  id: string
  name: string
  description?: string
  thumbnail?: string
  customText?: string
  htmlContent: string
  isActive: boolean
  createdAt: string
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [landingPageDomains, setLandingPageDomains] = useState<LandingPageDomainSetting[]>(DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS)
  const [newLandingPageDomain, setNewLandingPageDomain] = useState('')
  const [isSavingDomains, setIsSavingDomains] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    thumbnail: '',
    customText: '',
    htmlContent: '',
  })

  const checkUserRole = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role || 'OWNER')
        setUserId(data.id || 'current-user')
      } else {
        setUserRole('OWNER')
        setUserId('current-user')
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setUserRole('OWNER')
      setUserId('current-user')
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/landing-pages/templates')
      if (response.ok) {
        setTemplates(await response.json())
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchLandingPageDomains = useCallback(async () => {
    try {
      const response = await fetch('/api/landing-pages/domains')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.domains) && data.domains.length > 0) {
          setLandingPageDomains(data.domains)
        }
      }
    } catch (err) {
      console.error('Failed to load landing page domains:', err)
    }
  }, [])

  useEffect(() => {
    checkUserRole()
    fetchTemplates()
    fetchLandingPageDomains()
    setError('')
    setSuccess('')
  }, [checkUserRole, fetchTemplates, fetchLandingPageDomains])

  const addLandingPageDomain = () => {
    const domain = newLandingPageDomain.trim().toLowerCase()
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
      setError('Enter a valid root domain without https:// or a path')
      return
    }
    if (landingPageDomains.some((item) => item.domain === domain)) {
      setError('This landing page domain is already configured')
      return
    }
    if (landingPageDomains.length >= 10) {
      setError('You can configure up to 10 landing page domains')
      return
    }
    setLandingPageDomains((domains) => [...domains, { domain, includeProtocol: false }])
    setNewLandingPageDomain('')
    setError('')
  }

  const saveLandingPageDomains = async () => {
    setIsSavingDomains(true)
    setError('')
    try {
      const response = await fetch('/api/landing-pages/domains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: landingPageDomains }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save landing page domains')
      setLandingPageDomains(data.domains)
      setSuccess('Landing page domains saved')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save landing page domains')
    } finally {
      setIsSavingDomains(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (userRole !== 'OWNER') {
      setError('Only owners can add templates')
      return
    }

    if (!formData.name || !formData.htmlContent) {
      setError('Please fill in name and HTML content')
      return
    }

    try {
      setLoading(true)
      setError('')

      const url = editingId
        ? `/api/landing-pages/templates/${editingId}`
        : '/api/landing-pages/templates'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          userRole,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || data.error || 'Failed to save template')
      }

      setSuccess(editingId ? 'Template updated successfully!' : 'Template created successfully!')
      setFormData({
        name: '',
        description: '',
        thumbnail: '',
        customText: '',
        htmlContent: '',
      })
      setShowForm(false)
      setEditingId(null)
      setTimeout(() => {
        fetchTemplates()
        setSuccess('')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/landing-pages/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole || '',
          'x-user-id': userId || '',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setSuccess('Template deleted successfully!')
      setTimeout(() => {
        fetchTemplates()
        setSuccess('')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setLoading(false)
    }
  }

  const editTemplate = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      thumbnail: template.thumbnail || '',
      customText: template.customText || '',
      htmlContent: template.htmlContent,
    })
    setEditingId(template.id)
    setShowForm(true)
  }

  const cancelEdit = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      description: '',
      thumbnail: '',
      customText: '',
      htmlContent: '',
    })
  }

  if (authLoading) {
    return <AfficixoLoading compact />
  }

  if (userRole !== 'OWNER') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">Only owners can manage templates</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

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
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
            <p className="mt-1 text-sm text-slate-400">Manage landing page templates</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/owner/media"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600/70 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-700/80"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-md border border-slate-500/80 bg-slate-900 text-slate-200">
                <ImageIcon className="h-3 w-3" />
              </span>
              Media Source
            </Link>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            )}
          </div>
        </div>

        <section className="mb-6 rounded-lg border border-slate-700/80 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Landing page root domains</h2>
              <p className="mt-1 text-xs text-slate-400">Manage the domains shown on landing page links. Each domain must have DNS pointed to this app.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newLandingPageDomain}
              onChange={(event) => setNewLandingPageDomain(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLandingPageDomain()
                }
              }}
              placeholder="example.com"
              aria-label="New landing page root domain"
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
            <button
              type="button"
              onClick={addLandingPageDomain}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-600 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add domain
            </button>
          </div>
          <ul className="mt-3 divide-y divide-slate-800 border-y border-slate-800">
            {landingPageDomains.map((domain) => (
              <li key={domain.domain} className="flex min-h-10 items-center justify-between gap-3 py-1">
                <span className="font-mono text-sm text-emerald-300">{domain.domain}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={domain.includeProtocol}
                      onChange={(event) => setLandingPageDomains((domains) => domains.map((item) => item.domain === domain.domain
                        ? { ...item, includeProtocol: event.target.checked }
                        : item))}
                      disabled={isSavingDomains}
                      className="h-4 w-4 accent-emerald-500"
                      aria-label={`Show https:// for ${domain.domain}`}
                    />
                    <span>Show https://</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setLandingPageDomains((domains) => domains.filter((item) => item.domain !== domain.domain))}
                    disabled={landingPageDomains.length <= 1 || isSavingDomains}
                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remove ${domain.domain}`}
                    title="Remove domain"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Changes update generated links and host routing after saving.</p>
            <button
              type="button"
              onClick={saveLandingPageDomains}
              disabled={isSavingDomains}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isSavingDomains ? 'Saving...' : 'Save domains'}
            </button>
          </div>
        </section>

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-5">
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Copy Text</label>
                <textarea
                  value={formData.customText}
                  onChange={(e) => setFormData({ ...formData, customText: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use <code className="rounded bg-slate-800 px-1.5 py-0.5">{`{link}`}</code> as a placeholder for the landing page URL.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">HTML Content *</label>
                <textarea
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  rows={10}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use <code className="rounded bg-slate-800 px-1.5 py-0.5">{'{link.url}'}</code> where the tracking URL should appear, e.g. in <code className="rounded bg-slate-800 px-1.5 py-0.5">&lt;a href=&quot;{'{link.url}'}&quot;&gt;</code>.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-12 text-center">
            <p className="text-sm font-medium text-slate-400">No templates yet</p>
            <p className="mt-1 text-xs text-slate-500">Create your first template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
              >
                {template.thumbnail && (
                  <div className="mb-3 flex max-h-96 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="h-auto max-h-96 w-full object-contain"
                    />
                  </div>
                )}
                <h3 className="text-base font-semibold text-white">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{template.description}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  HTML: {template.htmlContent.length} chars
                </p>
                {template.customText && (
                  <p className="mt-1 truncate text-xs italic text-slate-400">
                    Copy text: {template.customText}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => editTemplate(template)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}