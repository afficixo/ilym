export interface ClickFingerprintInput {
  linkId: string
  ipAddress?: string | null
  userAgent?: string | null
  browser?: string | null
  os?: string | null
  deviceType?: string | null
}

export type ClickDedupeCondition = { ipAddress: string } | { userAgent: string }
export type ClickDedupeWhere = { linkAccountId: string; OR: ClickDedupeCondition[] }

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

const normalizeMatchValue = (value?: string | null) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const hasMeaningfulMatchValue = (value?: string | null) => {
  const normalized = normalizeMatchValue(value)
  return normalized !== '' && normalized !== 'unknown'
}

export function buildClickDedupeConditions(
  ipAddress?: string | null,
  userAgent?: string | null,
): ClickDedupeCondition[] {
  const conditions: ClickDedupeCondition[] = []
  const normalizedIp = (ipAddress || '').trim()
  const normalizedUserAgent = (userAgent || '').trim()

  if (hasMeaningfulMatchValue(normalizedIp)) conditions.push({ ipAddress: normalizedIp })
  if (hasMeaningfulMatchValue(normalizedUserAgent)) conditions.push({ userAgent: normalizedUserAgent })

  return conditions
}

export function buildClickDedupeWhere(
  linkAccountId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): ClickDedupeWhere | null {
  const conditions = buildClickDedupeConditions(ipAddress, userAgent)
  return conditions.length > 0 ? { linkAccountId, OR: conditions } : null
}

export function buildClickDedupeLockKeys(
  linkAccountId: string,
  clickSignature: string,
  ipAddress: string,
  userAgent: string,
): string[] {
  const linkScope = `link:${linkAccountId}:`
  const keys = [
    hasMeaningfulMatchValue(clickSignature) ? `${linkScope}signature:${normalizeMatchValue(clickSignature)}` : '',
    hasMeaningfulMatchValue(ipAddress) ? `${linkScope}ip:${normalizeMatchValue(ipAddress)}` : '',
    hasMeaningfulMatchValue(userAgent) ? `${linkScope}ua:${normalizeMatchValue(userAgent)}` : '',
  ]

  return keys.filter(Boolean).sort()
}
