import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { BotDetectionService } from '@/lib/services/bot-detection'
import { buildClickFingerprint, getClickDedupeWindowMs } from '@/lib/services/click-detection'
import { getGeoLocation } from '@/lib/services/geo/ip2location'
import { buildRedirectTargetUrl } from '@/lib/utils/redirect'
import { parseVisitorProfile } from '@/lib/utils/visitor-profile'
import { getOfferSelectionUserIds } from '@/lib/auth'
import { selectOffer as selectOfferFromVault } from '@/lib/utils/offer-selection'

const normalizeGroupName = (value?: string | null) => value?.trim() ?? ''

type Offer = {
  id: string
  priority: number
  rotationMode: string
  offerUrl: string
  country: string
  isGlobal: boolean
  isContentLocker: boolean
  isActive: boolean
  usaSecretRedirectEnabled: boolean
  createdAt: Date
  groupName: string | null
}

const getClientIp = (headers: Headers): string => {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('true-client-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

const buildRedirectResponse = (
  url: string,
  origin?: string | null,
  status: 302 | 307 = 302,
) => {
  const response = NextResponse.redirect(url, { status })
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.headers.set('Vary', 'Origin')
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return response
}

const selectRotatingOffer = (offers: Offer[]) => {
  if (!offers.length) return null
  if (offers.length === 1) return offers[0]

  const randomPool = offers.filter((offer) => offer.rotationMode === 'RANDOM')
  if (randomPool.length > 0) {
    return randomPool[Math.floor(Math.random() * randomPool.length)]
  }

  return [...offers].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.createdAt.getTime() - b.createdAt.getTime()
  })[0]
}

const normalizeDedupeValue = (value?: string | null) =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const buildDedupeLockKeys = (clickSignature: string, ipAddress: string, userAgent: string) => {
  return [clickSignature, ipAddress, userAgent]
    .map(normalizeDedupeValue)
    .filter((value) => value !== '' && value !== 'unknown')
    .reduce<string[]>((acc, value) => (acc.includes(value) ? acc : [...acc, value]), [])
    .sort()
}

const acquireDedupeLocks = async (tx: any, clickSignature: string, ipAddress: string, userAgent: string) => {
  const keys = buildDedupeLockKeys(clickSignature, ipAddress, userAgent)
  for (const key of keys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
  }
}

const selectGroupOffer = async (
  userIds: string[],
  country: string,
  groupName: string,
) => {
  for (const userId of userIds) {
    const regionalGroupCandidates = await prisma.offerVault.findMany({
      where: {
        userId,
        country,
        groupName,
        isActive: true,
        isGlobal: false,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    const offer = selectRotatingOffer(regionalGroupCandidates)
    if (offer) return offer
  }

  return null
}

const notFoundPageHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - Page Not Found</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: 'Tomorrow', sans-serif;
        height: 100vh;
        background-image: linear-gradient(to top, #2e1753, #1f1746, #131537, #0d1028, #050819);
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
      }
      .text {
        position: absolute;
        top: 10%;
        color: #fff;
        text-align: center;
      }
      h1 { font-size: 50px; }
      .star {
        position: absolute;
        width: 2px;
        height: 2px;
        background: #fff;
        right: 0;
        animation: starTwinkle 3s infinite linear;
      }
      .astronaut img {
        width: 100px;
        position: absolute;
        top: 55%;
        animation: astronautFly 6s infinite linear;
      }
      @keyframes astronautFly {
        0% { left: -100px; }
        25% { top: 50%; transform: rotate(30deg); }
        50% { transform: rotate(45deg); top: 55%; }
        75% { top: 60%; transform: rotate(30deg); }
        100% { left: 110%; transform: rotate(45deg); }
      }
      @keyframes starTwinkle {
        0% { background: rgba(255,255,255,0.4); }
        25% { background: rgba(255,255,255,0.8); }
        50% { background: rgba(255,255,255,1); }
        75% { background: rgba(255,255,255,0.8); }
        100% { background: rgba(255,255,255,0.4); }
      }
    </style>
  </head>
  <body>
    <div class="text">
      <div>ERROR</div>
      <h1>404</h1>
      <hr>
      <div>Page Not Found</div>
    </div>
    <div class="astronaut">
      <img src="https://images.vexels.com/media/users/3/152639/isolated/preview/506b575739e90613428cdb399175e2c8-space-astronaut-cartoon-by-vexels.png" alt="Astronaut" class="src" />
    </div>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        var body = document.body;
        setInterval(createStar, 100);
        function createStar() {
          var right = Math.random() * 500;
          var top = Math.random() * screen.height;
          var star = document.createElement('div');
          star.classList.add('star');
          body.appendChild(star);
          star.style.top = top + 'px';
          function runStar() {
            if (right >= screen.width) {
              star.remove();
              return;
            }
            right += 3;
            star.style.right = right + 'px';
          }
          setInterval(runStar, 10);
        }
      });
    </script>
  </body>
</html>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const headers = request.headers
    const userAgent = headers.get('user-agent') || ''
    const ip = getClientIp(headers)
    const referrer = headers.get('referer') || headers.get('referrer') || ''
    const origin = headers.get('origin') || ''
    const visitorProfile = parseVisitorProfile(userAgent)

    const link = await prisma.linkAccount.findUnique({
      where: { slug },
      include: {
        customDomain: true,
      },
    })

    if (!link || !link.isActive) {
      return new NextResponse(notFoundPageHtml, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const clickFingerprint = buildClickFingerprint({
      linkId: link.id,
      ipAddress: ip,
      userAgent,
      browser: visitorProfile.browser,
      os: visitorProfile.os,
      deviceType: visitorProfile.deviceType,
    })

    const dedupeWindowMs = getClickDedupeWindowMs()

    const botService = new BotDetectionService()

    // Convert headers to object for bot detection analysis
    const headersObj: Record<string, string | null> = {
      'user-agent': userAgent,
      'accept': headers.get('accept'),
      'accept-language': headers.get('accept-language'),
      'accept-encoding': headers.get('accept-encoding'),
      'cache-control': headers.get('cache-control'),
      'referer': referrer,
    }

    const [botResult, geo, offerUserIds] = await Promise.all([
      botService.detect(userAgent, ip, headersObj),
      getGeoLocation(ip, headers),
      getOfferSelectionUserIds(link.userId),
    ])

    if (botResult.isBot) {
      await prisma.$transaction(async (tx) => {
        await tx.linkAccount.update({
          where: { id: link.id },
          data: { botClicks: { increment: 1 } },
        })
      })

      console.log(`[BOT BLOCKED] Slug: ${slug}, IP: ${ip}, Reason: ${botResult.reasons.join(' | ')}, Score: ${botResult.score}, Confidence: ${botResult.confidence}`)
      const hawkTrkUrl = 'https://app.hawktrk.com/sl?id=6a2050db46d3cf0d62f32aa4&pid=2&sub2=u811439&sub6=s2smartLink&sub5=winner'
      return NextResponse.redirect(hawkTrkUrl, { status: 302 })
    }

    const fallbackCountry = (process.env.GEO_DEFAULT_COUNTRY || 'US').trim().toUpperCase()
    const resolvedGeoCountry = geo?.country_code?.trim().toUpperCase()
    const country = /^[A-Z]{2}$/.test(resolvedGeoCountry || '') ? resolvedGeoCountry! : fallbackCountry

    console.debug('[REDIRECT] geo lookup', {
      slug,
      ip,
      header_cf_ipcountry: headers.get('cf-ipcountry'),
      header_vercel_ip_country: headers.get('x-vercel-ip-country'),
      resolved_geo: geo,
      country,
    })

    if (!offerUserIds?.length) {
      console.warn('[REDIRECT] No offer selection user IDs resolved for link', { linkId: link.id, userId: link.userId })
    }

    let offer;
    try {
      offer = await selectOfferFromVault(prisma as any, offerUserIds, country, link.offerGroupName);
    } catch (error) {
      console.error('[REDIRECT] Failed to select offer:', error);
      return new NextResponse('Failed to select offer', { status: 500 });
    }

    console.debug('[REDIRECT] offer selection', {
      slug,
      offerUserIds: offerUserIds.slice(0, 10),
      selectedOfferId: offer?.id,
      selectedOfferCountry: offer?.country,
      selectedOfferUrl: offer?.offerUrl,
    })

    if (!offer) {
      return new NextResponse('No owner offer found', { status: 404 })
    }

    const finalUrl = offer.isContentLocker
      ? offer.offerUrl
      : buildRedirectTargetUrl(offer.offerUrl, slug)

    const response = buildRedirectResponse(finalUrl, origin, 302)
    const loggingTask = prisma.$transaction(async (tx) => {
      await acquireDedupeLocks(tx, clickFingerprint, ip, userAgent)

      let isDuplicate = false

      if (userAgent) {
        const recentUserAgentClick = await tx.click.findFirst({
          where: {
            userAgent,
            createdAt: {
              gte: new Date(Date.now() - dedupeWindowMs),
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (recentUserAgentClick) {
          isDuplicate = true
        }
      }

      if (!isDuplicate && ip) {
        const ipMatchClick = await tx.click.findFirst({
          where: {
            ipAddress: ip,
            createdAt: {
              gte: new Date(Date.now() - dedupeWindowMs),
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (ipMatchClick) {
          isDuplicate = true
        }
      }

      await tx.click.create({
        data: {
          linkAccountId: link.id,
          clickSignature: clickFingerprint,
          ipAddress: ip,
          userAgent: userAgent,
          country: country || null,
          region: geo?.region || null,
          city: geo?.city || null,
          isp: geo?.isp || null,
          browser: visitorProfile.browser,
          browserVersion: visitorProfile.browserVersion,
          os: visitorProfile.os,
          deviceType: visitorProfile.deviceType,
          deviceBrand: visitorProfile.deviceBrand,
          referrer: referrer || null,
          isUnique: !isDuplicate,
          isBot: false,
        },
      })

      await tx.linkAccount.update({
        where: { id: link.id },
        data: {
          totalClicks: { increment: 1 },
          ...(!isDuplicate ? { uniqueClicks: { increment: 1 } } : {}),
        },
      })

      return isDuplicate
    })

    const requestWithWaitUntil = request as Request & {
      waitUntil?: (promise: Promise<unknown>) => void
    }

    if (typeof requestWithWaitUntil.waitUntil === 'function') {
      requestWithWaitUntil.waitUntil(
        loggingTask.then((isDuplicate) => {
          if (isDuplicate) {
            console.debug('Duplicate click detected and stored for link', link.id)
          }
        }).catch((error) => {
          console.error('Click logging failed:', error)
        })
      )
    } else {
      const isDuplicateAfterLock = await loggingTask
      if (isDuplicateAfterLock) {
        console.debug('Duplicate click detected and stored for link', link.id)
      }
    }

    return response
  } catch (error) {
    console.error('Redirect error:', error)
    return new NextResponse('Redirect failed', { status: 500 })
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Referer, Origin')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}