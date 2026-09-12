export function getLandingPageSubdomainFromHost(hostHeader?: string | null): string | null {
  if (!hostHeader) return null

  const host = hostHeader.split(':')[0].toLowerCase().trim()
  if (!host) return null

  const landingPageDomain = (process.env.NEXT_PUBLIC_LANDING_PAGE_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .split(':')[0]
    .toLowerCase()

  const configuredRootDomain = landingPageDomain.replace(/^www\./i, '')
  const fallbackRootDomains = ['weebly.pro', 'www.weebly.pro', 'afficix.com', 'www.afficix.com']
  const candidateRootDomains = new Set([
    configuredRootDomain,
    `www.${configuredRootDomain}`,
    `admin.${configuredRootDomain}`,
    `app.${configuredRootDomain}`,
    `api.${configuredRootDomain}`,
    ...fallbackRootDomains,
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
