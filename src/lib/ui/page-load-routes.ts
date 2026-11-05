const pageLoadRoutes = new Set([
  '/admin/dashboard',
  '/owner/dashboard',
  '/publisher/dashboard',
  '/admin/links',
  '/admin/postbacks',
  '/admin/landing-builder',
  '/admin/templates',
  '/admin/url-shortener',
  '/owner/url-shortener',
  '/admin/payments',
  '/owner/payments',
  '/publisher/payments',
])

export function shouldShowPageLoader(pathname: string) {
  return pageLoadRoutes.has(pathname.replace(/\/+$/, ''))
}
