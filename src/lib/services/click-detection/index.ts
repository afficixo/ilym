export interface ClickFingerprintInput {
  linkId: string
  ipAddress?: string | null
  userAgent?: string | null
  browser?: string | null
  os?: string | null
  deviceType?: string | null
}

export interface DuplicateClickContext {
  clickSignature?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  lastClickSignature?: string | null
  lastIpAddress?: string | null
  lastUserAgent?: string | null
}

export const CLICK_DEDUPE_WINDOW_MS = 10 * 60 * 1000

export function getClickDedupeWindowMs(): number {
  const minutesEnv = process.env.CLICK_DEDUPE_WINDOW_MINUTES || process.env.DUPLICATE_DEDUPE_WINDOW_MINUTES
  if (minutesEnv) {
    const minutes = Number(minutesEnv)
    if (Number.isFinite(minutes) && minutes > 0) {
      return minutes * 60 * 1000
    }
  }

  const msEnv = process.env.CLICK_DEDUPE_WINDOW_MS
  if (msEnv) {
    const ms = Number(msEnv)
    if (Number.isFinite(ms) && ms > 0) {
      return ms
    }
  }

  return CLICK_DEDUPE_WINDOW_MS
}

export function buildClickFingerprint({
  linkId,
  ipAddress,
  userAgent,
  browser,
  os,
  deviceType,
}: ClickFingerprintInput): string {
  const normalizedIp = (ipAddress || 'unknown').trim().toLowerCase()
  const normalizedUserAgent = (userAgent || '').trim().replace(/\s+/g, ' ')
  const normalizedBrowser = (browser || '').trim().toLowerCase()
  const normalizedOs = (os || '').trim().toLowerCase()
  const normalizedDeviceType = (deviceType || '').trim().toLowerCase()

  return [
    `link:${linkId}`,
    `ip:${normalizedIp}`,
    `ua:${normalizedUserAgent}`,
    `browser:${normalizedBrowser}`,
    `os:${normalizedOs}`,
    `device:${normalizedDeviceType}`,
  ].join('|')
}

export function isDuplicateVisit(lastSeenAt: Date, now: Date, windowMs = CLICK_DEDUPE_WINDOW_MS): boolean {
  const delta = now.getTime() - lastSeenAt.getTime()
  return Number.isFinite(delta) && delta >= 0 && delta <= windowMs
}

const normalizeMatchValue = (value?: string | null) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const hasMeaningfulMatchValue = (value?: string | null) => {
  const normalized = normalizeMatchValue(value)
  return normalized !== '' && normalized !== 'unknown'
}

export function isDuplicateClickEvent(
  lastSeenAt: Date,
  now: Date,
  context: DuplicateClickContext,
  windowMs = CLICK_DEDUPE_WINDOW_MS,
): boolean {
  const sameIpAddress = Boolean(
    hasMeaningfulMatchValue(context.ipAddress) &&
      hasMeaningfulMatchValue(context.lastIpAddress) &&
      normalizeMatchValue(context.ipAddress) === normalizeMatchValue(context.lastIpAddress),
  )

  if (sameIpAddress && isDuplicateVisit(lastSeenAt, now, windowMs)) {
    return true
  }

  if (!isDuplicateVisit(lastSeenAt, now, windowMs)) {
    return false
  }

  const sameClickSignature = Boolean(
    context.clickSignature &&
      context.lastClickSignature &&
      normalizeMatchValue(context.clickSignature) === normalizeMatchValue(context.lastClickSignature),
  )

  if (sameClickSignature) {
    return true
  }

  const sameUserAgent = Boolean(
    hasMeaningfulMatchValue(context.userAgent) &&
      hasMeaningfulMatchValue(context.lastUserAgent) &&
      normalizeMatchValue(context.userAgent) === normalizeMatchValue(context.lastUserAgent),
  )

  return sameUserAgent
}

export function isUniqueVisit(lastSeenAt: Date, now: Date, windowMs = CLICK_DEDUPE_WINDOW_MS): boolean {
  return !isDuplicateVisit(lastSeenAt, now, windowMs)
}

export const CLICK_DEDUPE_WINDOW = CLICK_DEDUPE_WINDOW_MS
