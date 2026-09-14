import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCookieValue } from '@/lib/utils/helpers'
import { getLandingPageSubdomainFromHost } from '@/lib/utils/landing-page-host'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const host = request.headers.get('host')
  const subdomain = getLandingPageSubdomainFromHost(host)

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

  if (path === '/login' && token) {
    const dashboardUrl = new URL('/admin/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
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