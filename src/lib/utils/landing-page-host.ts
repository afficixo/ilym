export interface LandingPageDomainSetting {
  domain: string
  includeProtocol: boolean
}

export const DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS: LandingPageDomainSetting[] = [
  { domain: 'weobly.com', includeProtocol: false },
  { domain: 'weebly.pro', includeProtocol: true },
]
export const DEFAULT_LANDING_PAGE_DOMAINS = DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS.map(({ domain }) => domain)

export function formatLandingPageUrl(subdomain: string, setting: LandingPageDomainSetting): string {
  return `${setting.includeProtocol ? 'https://' : ''}${subdomain}.${setting.domain}`
}

export function deserializeLandingPageDomain(value: string): LandingPageDomainSetting {
  const hasExplicitProtocol = /^https?:\/\//i.test(value)
  const domain = value.replace(/^https?:\/\//i, '')
  const defaultProtocol = DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS.find((setting) => setting.domain === domain)?.includeProtocol ?? false

  return {
    domain,
    includeProtocol: hasExplicitProtocol ? /^https:\/\//i.test(value) : defaultProtocol,
  }
}

export function serializeLandingPageDomain(setting: LandingPageDomainSetting): string {
  return `${setting.includeProtocol ? 'https://' : 'http://'}${setting.domain}`
}

export function getLandingPageSubdomainFromHost(
  hostHeader?: string | null,
  additionalRootDomains?: string[],
): string | null {
  if (!hostHeader) return null

  const host = hostHeader.split(':')[0].toLowerCase().trim()
  if (!host) return null

  const landingPageDomain = (process.env.NEXT_PUBLIC_LANDING_PAGE_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .split(':')[0]
    .toLowerCase()

  const configuredRootDomain = landingPageDomain.replace(/^www\./i, '')
  const fallbackRootDomains = additionalRootDomains === undefined
    ? [...DEFAULT_LANDING_PAGE_DOMAINS, 'afficix.com'].flatMap((domain) => [domain, `www.${domain}`])
    : []
  const candidateRootDomains = new Set([
    configuredRootDomain,
    `www.${configuredRootDomain}`,
    `admin.${configuredRootDomain}`,
    `app.${configuredRootDomain}`,
    `api.${configuredRootDomain}`,
    ...fallbackRootDomains,
    ...(additionalRootDomains || []).flatMap((domain) => {
      const rootDomain = domain.replace(/^https?:\/\//i, '').toLowerCase()
      return [rootDomain, `www.${rootDomain}`]
    }),
  ])

  const rootDomains = [...candidateRootDomains].filter(Boolean)
  const knownHosts = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    ...rootDomains,
  ])

  if (knownHosts.has(host)) return null

  if (host.endsWith('.localhost')) {
    const subdomain = host.replace(/\.localhost$/i, '')
    return subdomain && !['www', 'admin', 'app', 'api'].includes(subdomain) ? subdomain : null
  }

  for (const rootDomain of rootDomains) {
    if (host === rootDomain || host === `www.${rootDomain}`) {
      return null
    }

    if (host.endsWith(`.${rootDomain}`)) {
      const subdomain = host.slice(0, -(rootDomain.length + 1))
      return subdomain && !['www', 'admin', 'app', 'api'].includes(subdomain) ? subdomain : null
    }
  }

  return null
}
