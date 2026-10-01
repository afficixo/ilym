import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCookieValue } from '@/lib/utils/helpers'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_LANDING_PAGE_DOMAINS, getLandingPageSubdomainFromHost } from '@/lib/utils/landing-page-host'

async function getLandingPageSubdomain(host?: string | null) {
  const hostname = host?.split(':')[0].toLowerCase().trim()
  if (!hostname || hostname.split('.').length < 3 || hostname.endsWith('.localhost')) {
    return getLandingPageSubdomainFromHost(host, [])
  }

  try {
    const settings = await prisma.landingDomainSettings.findUnique({
      where: { id: 'default' },
      select: { domains: true },
    })
    return getLandingPageSubdomainFromHost(host, settings?.domains ?? DEFAULT_LANDING_PAGE_DOMAINS)
  } catch (error) {
    console.error('Failed to load landing page domains:', error)
    return getLandingPageSubdomainFromHost(host)
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const host = request.headers.get('host')
  const subdomain = await getLandingPageSubdomain(host)

  // If subdomain is detected and root path, route to landing page
  if (subdomain && (path === '/' || path === '')) {
    const landingPageUrl = new URL(`/lp/${encodeURIComponent(subdomain)}${request.nextUrl.search}`, request.url)
    return NextResponse.rewrite(landingPageUrl)
  }

  const publicPaths = ['/', '/login', '/stats']
  const isPublicPath = publicPaths.some(p => path.startsWith(p))

  const cookieHeader = request.headers.get('cookie') || ''
  const token = getCookieValue(cookieHeader, 'auth-token')

  const response = NextResponse.next()

  if (path.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
  }

  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (!isPublicPath && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const dashboardAlias = path.match(/^\/(owner|publisher)(\/.*)?$/)
  const hasDedicatedRoute =
    path === '/owner/dashboard' ||
    path === '/owner/managers' ||
    path.startsWith('/owner/managers/') ||
    path === '/owner/admins' ||
    path.startsWith('/owner/admins/') ||
    path === '/owner/media' ||
    path.startsWith('/owner/media/') ||
    path === '/owner/support' ||
    path === '/publisher/dashboard' ||
    path === '/publisher/help'

  if (dashboardAlias && !hasDedicatedRoute) {
    const rewrittenUrl = request.nextUrl.clone()
    rewrittenUrl.pathname = `/admin${dashboardAlias[2] || '/dashboard'}`
    return NextResponse.rewrite(rewrittenUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except:
    // - _next internals (static, image optimization)
    // - Static files and assets (all common file extensions)
    // - API auth endpoints
    '/((?!_next|favicon|robots\\.txt|sitemap\\.xml|api/auth|.*\\.(?:png|jpg|jpeg|gif|ico|svg|webp|css|js|json|woff|woff2|ttf|eot|txt|xml|map)).*)',
  ],
}