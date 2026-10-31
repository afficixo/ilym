import type { MetadataRoute } from 'next'

const siteUrl = 'https://afficix.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/` },
    { url: `${siteUrl}/privacy-policy` },
    { url: `${siteUrl}/terms-of-service` },
  ]
}
