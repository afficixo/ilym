'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

const allowedTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg']

interface MediaAsset {
  id: number
  name: string
  mime_type: string
  source: string
  created_at: string
}

export default function MediaSourcePage() {
  const [preview, setPreview] = useState('')
  const [fileName, setFileName] = useState('')
  const [pendingImage, setPendingImage] = useState<{ file: File; name: string; type: string; size: number } | null>(null)
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [expandedImage, setExpandedImage] = useState<MediaAsset | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const loadMedia = async () => {
    try {
      const response = await fetch('/api/media')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load media')
      }

      setMedia(Array.isArray(data.items) ? data.items : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load media')
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  useEffect(() => {
    return () => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG, GIF, and JPG/JPEG images are supported.')
      setPendingImage(null)
      setPreview('')
      setFileName('')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.')
      setPendingImage(null)
      setPreview('')
      setFileName('')
      event.target.value = ''
      return
    }

    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    setFileName(file.name)
    setPendingImage({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    })
    setError('')
    setSuccess('')
    event.target.value = ''
  }

  const saveSelectedImage = async () => {
    if (!pendingImage) return

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', pendingImage.file)
      formData.append('name', pendingImage.name)
      formData.append('mimeType', pendingImage.type)

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save media')
      }

      const savedSource = data.url || data.item?.source || ''
      setPreview('')
      setFileName('')
      setPendingImage(null)
      setSuccess('Image saved to the media library.')
      if (savedSource) {
        setPreview('')
      }
      await loadMedia()
      setTimeout(() => setSuccess(''), 2600)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save media')
    } finally {
      setIsSaving(false)
    }
  }

  const copyText = async (value: string, successMessage: string) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setSuccess(successMessage)
      setTimeout(() => setSuccess(''), 2200)
      return true
    } catch {
      setError('Clipboard copy failed. Please copy the value manually.')
      return false
    }
  }

  const clearSource = () => {
    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    setPreview('')
    setFileName('')
    setPendingImage(null)
    setError('')
    setSuccess('Media cleared from this session.')
    setTimeout(() => setSuccess(''), 2000)
  }

  const getAbsoluteMediaUrl = (source: string) => {
    if (!source) return ''

    if (source.startsWith('http://') || source.startsWith('https://')) {
      return source
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
    return `${origin}${source.startsWith('/') ? source : `/${source}`}`
  }

  const deleteMediaItem = async (id: number) => {
    setDeletingId(id)
    setError('')

    try {
      const response = await fetch('/api/media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete media')
      }

      setMedia((current) => current.filter((item) => item.id !== id))
      if (expandedImage?.id === id) {
        setExpandedImage(null)
      }
      setConfirmDeleteId((current) => (current === id ? null : current))
      setSuccess('Image deleted from the library.')
      setTimeout(() => setSuccess(''), 2200)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete media')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] px-2 py-2 text-[var(--text-primary)] sm:px-3 lg:px-4">
      <div className="mx-auto w-full max-w-none">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[rgba(148,163,184,0.4)] hover:bg-[rgba(15,23,42,0.08)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-[0_4px_12px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="border-b border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2 sm:px-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)]">
                <ImageIcon className="h-3.5 w-3.5" />
              </div>

              <h1 className="text-sm font-semibold text-[var(--text-primary)]">Media library</h1>
            </div>
          </div>

          <div className="space-y-1.5 p-1.5 sm:p-2">
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            <div className="rounded-[12px] border border-[var(--surface-border)] bg-[var(--surface-bg)] p-1.5 sm:p-2">
              <div className="mb-1.5 border-b border-[var(--surface-border)] pb-1">
                <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Upload</h2>
              </div>

              {(preview || pendingImage) && (
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={clearSource}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--surface-border)] bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-slate-400/50 hover:bg-white/10"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              )}

              <label className="group flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-slate-400/25 bg-[var(--surface-card)] p-1.5 text-center transition duration-200 hover:border-slate-500/40">
                {pendingImage ? (
                  <>
                    <div className="w-full overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] p-2">
                      <Image src={preview} alt="Selected preview" width={800} height={600} className="mx-auto max-h-52 w-auto max-w-full rounded-xl object-contain" />
                    </div>

                    <div className="w-full space-y-3 text-left">
                      <div>
                        <p className="truncate text-base font-semibold text-[var(--text-primary)]">{pendingImage.name}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {(pendingImage.size / 1024 / 1024).toFixed(2)} MB · Ready to save
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={saveSelectedImage}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? 'Saving...' : 'Save to library'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingImage(null)
                            setPreview('')
                            setFileName('')
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-[var(--surface-border)] bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                        >
                          Change file
                        </button>
                      </div>
                    </div>
                  </>
                ) : preview ? (
                  <>
                    <div className="w-full overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] p-2">
                      <Image src={preview} alt="Selected preview" width={800} height={600} className="mx-auto max-h-52 w-auto max-w-full rounded-xl object-contain" />
                    </div>

                    <div className="w-full text-left">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">{fileName || 'Selected image'}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Preview ready. Confirm before saving.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] p-2 text-[var(--text-secondary)]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">Upload image</p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">PNG, JPG, or GIF up to 5MB</p>
                    </div>
                  </>
                )}

                <input type="file" accept="image/png,image/gif,image/jpeg,image/jpg" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="rounded-[12px] border border-[var(--surface-border)] bg-[var(--surface-bg)] p-1.5 sm:p-2">
              {media.length > 0 ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between gap-3 border-b border-[var(--surface-border)] pb-1">
                    <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Saved images</h2>
                    <span className="rounded-full border border-[var(--surface-border)] bg-white/5 px-2 py-0.5 text-[7px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      {media.length} total
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {media.map((item) => (
                      <div key={item.id} className="rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-card)] p-2 transition hover:border-slate-400/30 hover:bg-white/[0.02]">
                        <button type="button" onClick={() => setExpandedImage(item)} className="block w-full overflow-hidden rounded-[12px] border border-[var(--surface-border)] bg-[var(--surface-bg)]">
                          <Image src={item.source} alt={item.name} width={400} height={200} className="h-24 w-full object-contain transition hover:scale-[1.02]" />
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId((current) => (current === item.id ? null : item.id))}
                              disabled={deletingId === item.id}
                              className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-600 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Delete image"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>

                            {confirmDeleteId === item.id && (
                              <div className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 p-1">
                                <button
                                  type="button"
                                  onClick={() => deleteMediaItem(item.id)}
                                  className="rounded-md bg-red-600 px-2 py-0.5 text-[8px] font-semibold text-white transition hover:bg-red-500"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-md border border-[var(--surface-border)] bg-white/5 px-2 py-0.5 text-[8px] font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">Path</p>
                              <button
                                type="button"
                                onClick={() => copyText(item.source, 'Path copied to clipboard.')}
                                className="inline-flex items-center justify-center rounded-md border border-[var(--surface-border)] bg-white/5 px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                              >
                                Copy
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={item.source.length > 120 ? `${item.source.slice(0, 120)}...` : item.source}
                              title={item.source}
                              className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] px-2 py-1.5 font-mono text-[9px] text-[var(--text-secondary)] outline-none"
                            />
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">Domain URL</p>
                              <button
                                type="button"
                                onClick={() => copyText(getAbsoluteMediaUrl(item.source), 'Domain URL copied to clipboard.')}
                                className="inline-flex items-center justify-center rounded-md border border-[var(--surface-border)] bg-white/5 px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                              >
                                Copy
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={getAbsoluteMediaUrl(item.source).length > 120 ? `${getAbsoluteMediaUrl(item.source).slice(0, 120)}...` : getAbsoluteMediaUrl(item.source)}
                              title={getAbsoluteMediaUrl(item.source)}
                              className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] px-2 py-1.5 font-mono text-[9px] text-[var(--text-secondary)] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[150px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--surface-border)] bg-[var(--surface-bg)] px-4 py-6 text-center">
                  <div className="mb-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-2 text-[var(--text-secondary)]">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">No uploads yet</p>
                  <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    Upload an image to create a reusable asset for your landing pages.
                  </p>
                </div>
              )}
            </div>

            {expandedImage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
                <div className="relative w-full max-w-4xl rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setExpandedImage(null)}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--surface-border)] bg-white/5 text-[var(--text-primary)] transition hover:bg-white/10"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] p-2">
                    <Image src={expandedImage.source} alt={expandedImage.name} width={1200} height={900} className="max-h-[70vh] w-full rounded-xl object-contain" />
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{expandedImage.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(expandedImage.source, 'Image source copied.')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--surface-border)] bg-white/5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy url
                      </button>

                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId((current) => (current === expandedImage.id ? null : expandedImage.id))}
                          disabled={deletingId === expandedImage.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>

                        {confirmDeleteId === expandedImage.id && (
                          <div className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => deleteMediaItem(expandedImage.id)}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-red-500"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-[var(--surface-border)] bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[var(--text-primary)] transition hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
