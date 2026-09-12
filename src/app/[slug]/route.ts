import { NextResponse, type NextRequest } from 'next/server';
import { randomInt } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { BotDetectionService } from '@/lib/services/bot-detection';
import { buildClickFingerprint, getClickDedupeWindowMs, isDuplicateClickEvent } from '@/lib/services/click-detection';
import { getGeoLocation } from '@/lib/services/geo/ip2location';
import { buildRedirectTargetUrl } from '@/lib/utils/redirect';
import { parseVisitorProfile } from '@/lib/utils/visitor-profile';
import { getOfferSelectionUserIds, getOwnerUserId } from '@/lib/auth';
import { selectOffer as selectOfferFromVault } from '@/lib/utils/offer-selection';
import { getCorsHeaders, isOriginAllowed } from '@/config/cors';

const normalizeGroupName = (value?: string | null) => value?.trim() ?? '';

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
      h1 {
        font-size: 50px;
      }
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

// ========== OFFER SELECTION ==========

const selectRotatingOffer = (
  offers: Array<{
    id: string;
    priority: number;
    rotationMode: string;
    offerUrl: string;
    country: string;
    isGlobal: boolean;
    isContentLocker: boolean;
    isActive: boolean;
    usaSecretRedirectEnabled: boolean;
    createdAt: Date;
    groupName: string | null;
  }>
) => {
  if (!offers.length) return null;
  if (offers.length === 1) return offers[0];

  const randomPool = offers.filter((offer) => offer.rotationMode === 'RANDOM');
  if (randomPool.length > 0) {
    const randomIndex = randomInt(0, randomPool.length);
    return randomPool[randomIndex];
  }

  return [...offers].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
};

const selectGroupOffer = async (
  tx: any,
  userId: string,
  country: string,
  groupName: string
) => {
  const regionalGroupCandidates = await tx.offerVault.findMany({
    where: {
      userId,
      country,
      groupName,
      isActive: true,
      isGlobal: false,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  return selectRotatingOffer(regionalGroupCandidates);
};

const selectOffer = async (
  tx: any,
  userIds: string[],
  country: string,
  linkGroupName: string | null
) => {
  for (const userId of userIds) {
    let offer: any = null;

    if (linkGroupName) {
      offer = await selectGroupOffer(tx, userId, country, linkGroupName);
      if (offer) return offer;
    }

    const countryCandidates = await tx.offerVault.findMany({
      where: {
        userId,
        country,
        isActive: true,
        isGlobal: false,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const namedGroupCandidates = countryCandidates.filter(
      (c: any) => normalizeGroupName(c.groupName) && (!linkGroupName || normalizeGroupName(c.groupName) === linkGroupName)
    );
    const directCountryCandidates = countryCandidates.filter((c: any) => !normalizeGroupName(c.groupName));

    offer = selectRotatingOffer(
      namedGroupCandidates.length ? namedGroupCandidates : directCountryCandidates
    );
    if (offer) return offer;

    if (linkGroupName) {
      const globalGroupCandidates = await tx.offerVault.findMany({
        where: {
          userId,
          groupName: linkGroupName,
          isActive: true,
          OR: [
            { isGlobal: true },
            { isContentLocker: true },
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      offer = selectRotatingOffer(globalGroupCandidates);
      if (offer) return offer;
    }

    const globalCandidates = await tx.offerVault.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { isGlobal: true },
          { isContentLocker: true },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    offer = selectRotatingOffer(globalCandidates);
    if (offer) return offer;
  }

  return null;
};

// ========== HELPERS ==========

const getClientIp = (headers: Headers): string => {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('true-client-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
};

const normalizeDedupeValue = (value?: string | null) =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const buildDedupeLockKeys = (clickSignature: string, ipAddress: string, userAgent: string) => {
  return [clickSignature, ipAddress, userAgent]
    .map(normalizeDedupeValue)
    .filter((value) => value !== '' && value !== 'unknown')
    .reduce<string[]>((acc, value) => (acc.includes(value) ? acc : [...acc, value]), [])
    .sort();
};

const acquireDedupeLocks = async (tx: any, clickSignature: string, ipAddress: string, userAgent: string) => {
  const keys = buildDedupeLockKeys(clickSignature, ipAddress, userAgent);
  for (const key of keys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }
};

const logBotClick = async (tx: any, linkId: string) => {
  await tx.linkAccount.update({
    where: { id: linkId },
    data: { botClicks: { increment: 1 } },
  });
};

const buildRedirectResponse = (
  url: string,
  origin?: string | null,
  status: 302 | 307 = 302
): NextResponse => {
  const response = NextResponse.redirect(url, { status });
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
};

// ========== MAIN HANDLER ==========

const staticAssetMimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const findExistingPublicAsset = async (pathname: string) => {
  const normalized = pathname.replace(/^\/+/, '');
  if (!normalized || !path.extname(normalized)) return null;

  const candidates = Array.from(new Set([
    normalized,
    normalized.toLowerCase(),
    normalized.toUpperCase(),
  ])).filter(Boolean);

  for (const candidate of candidates) {
    const candidatePath = path.join(process.cwd(), 'public', candidate);
    try {
      await fs.access(candidatePath);
      return `/${candidate}`;
    } catch {
      // continue to next candidate
    }
  }

  return null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const pathname = request.nextUrl.pathname;

    // Extra safety: block internal routes (should be caught by proxy middleware)
    if (slug === '_next' || slug.startsWith('_next')) {
      return new NextResponse('Not Found', { status: 404 });
    }

    if (path.extname(pathname) && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      const publicAssetPath = await findExistingPublicAsset(pathname);
      if (publicAssetPath) {
        return NextResponse.rewrite(new URL(publicAssetPath, request.url));
      }
    }

    const headers = request.headers;
    const ip = getClientIp(headers);
    const userAgent = headers.get('user-agent') || '';
    const referrer = headers.get('referer') || '';
    const origin = headers.get('origin') || '';
    const visitorProfile = parseVisitorProfile(userAgent);

    // ────────────────────────────────────────────────────────────────
    // 1. Validate the link
    // ────────────────────────────────────────────────────────────────
    const link = await prisma.linkAccount.findUnique({
      where: { slug },
      include: { customDomain: true },
    });

    if (!link || !link.isActive) {
      return new NextResponse(notFoundPageHtml, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 2. Build fingerprint (used for deduplication)
    // ────────────────────────────────────────────────────────────────
    const clickFingerprint = buildClickFingerprint({
      linkId: link.id,
      ipAddress: ip,
      userAgent,
      browser: visitorProfile.browser,
      os: visitorProfile.os,
      deviceType: visitorProfile.deviceType,
    });

    // ────────────────────────────────────────────────────────────────
    // 3. Bot detection (run before geo lookup to save costs)
    // ────────────────────────────────────────────────────────────────
    const botService = new BotDetectionService();
    
    // Convert headers to object for bot detection analysis
    const headersObj: Record<string, string | null> = {
      'user-agent': userAgent,
      'accept': headers.get('accept'),
      'accept-language': headers.get('accept-language'),
      'accept-encoding': headers.get('accept-encoding'),
      'cache-control': headers.get('cache-control'),
      'referer': referrer,
    };
    
    const botResult = await botService.detect(userAgent, ip, headersObj);

    if (botResult.isBot) {
      await prisma.$transaction(async (tx) => {
        await logBotClick(tx, link.id);
      });

      console.log(`[BOT BLOCKED] Slug: ${slug}, IP: ${ip}, Reason: ${botResult.reasons.join(' | ')}, Score: ${botResult.score}, Confidence: ${botResult.confidence}`);
      const hawkTrkUrl = 'https://app.hawktrk.com/sl?id=6a2050db46d3cf0d62f32aa4&pid=2&sub2=u811439&sub6=s2smartLink&sub5=winner';
      return NextResponse.redirect(hawkTrkUrl, { status: 302 });
    }

    // ────────────────────────────────────────────────────────────────
    // 4. Geo lookup (only after bot check)
    // ────────────────────────────────────────────────────────────────
    const geo = await getGeoLocation(ip, headers);
    const fallbackCountry = (process.env.GEO_DEFAULT_COUNTRY || 'US').trim().toUpperCase();
    const resolvedGeoCountry = geo?.country_code?.trim().toUpperCase();
    const country = /^[A-Z]{2}$/.test(resolvedGeoCountry || '') ? resolvedGeoCountry! : fallbackCountry;

    const dedupeWindowMs = getClickDedupeWindowMs();

    let offerUserIds: string[] = [];
    try {
      offerUserIds = await getOfferSelectionUserIds(link.userId);
    } catch (error) {
      console.error('[REDIRECT] Failed to get offer selection user IDs:', error);
      return new NextResponse('Failed to process link', { status: 500 });
    }

    let offer;
    try {
      offer = await selectOfferFromVault(prisma as any, offerUserIds, country, link.offerGroupName);
    } catch (error) {
      console.error('[REDIRECT] Failed to select offer:', error);
      return new NextResponse('Failed to select offer', { status: 500 });
    }

    if (!offer) {
      return new NextResponse('No owner offer found', { status: 404 });
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Main transaction: click logging + dedupe
    // ────────────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      await acquireDedupeLocks(tx, clickFingerprint, ip, userAgent);

      // ── 6a. Re-check duplicate under lock ──
      const recentWindowStart = new Date(Date.now() - dedupeWindowMs);

      const existing = await tx.click.findFirst({
        where: {
          linkAccountId: link.id,
          OR: [
            // Same IP must always count as the same visitor, even across days.
            ...(ip && ip !== 'unknown' ? [{ ipAddress: ip }] : []),
            {
              AND: [
                { clickSignature: clickFingerprint },
                { createdAt: { gte: recentWindowStart } },
              ],
            },
            ...(userAgent
              ? [{
                  AND: [
                    { userAgent },
                    { createdAt: { gte: recentWindowStart } },
                  ],
                }]
              : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, clickSignature: true, ipAddress: true, userAgent: true },
      });

      const isDuplicate = existing
        ? isDuplicateClickEvent(
            new Date(existing.createdAt),
            new Date(),
            {
              clickSignature: clickFingerprint,
              ipAddress: ip,
              userAgent,
              lastClickSignature: existing.clickSignature,
              lastIpAddress: existing.ipAddress,
              lastUserAgent: existing.userAgent,
            },
            dedupeWindowMs,
          )
        : false;

      // ── 6b. Handle USA Secret Redirect Mode ──
      const isUsaSecretMode = country === 'US' && offer.usaSecretRedirectEnabled === true;
        const ownerSettings = await tx.user.findUnique({ where: { id: (offer as any).userId }, select: { canUseSecretRedirect: true } });
        const isAllowedSecretMode = ownerSettings?.canUseSecretRedirect !== false;
        const percentage = Math.max(
        0,
        Math.min(100, (offer as any).usaSecretRedirectPercentage ?? 50)
      );
      const isSecretRedirect = isUsaSecretMode && isAllowedSecretMode && randomInt(1, 101) <= percentage;

      if (isSecretRedirect) {
        return {
          offer,
          shouldRedirect: true,
          isSecret: true,
          isDuplicate: false,
        };
      }

      // ── 6c. Log click if not duplicate ──
      await tx.click.create({
        data: {
          linkAccountId: link.id,
          clickSignature: clickFingerprint,
          ipAddress: ip,
          userAgent,
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
      });

      await tx.linkAccount.update({
        where: { id: link.id },
        data: {
          totalClicks: { increment: 1 },
          ...(isDuplicate ? {} : { uniqueClicks: { increment: 1 } }),
        },
      });

      if (isDuplicate) {
        console.debug('Duplicate click detected and stored for link', link.id);
      }

      return {
        offer,
        shouldRedirect: true,
        isSecret: false,
        isDuplicate,
      };
    });

    // ────────────────────────────────────────────────────────────────
    // 7. Build and return redirect response
    // ────────────────────────────────────────────────────────────────
    const finalUrl = result.offer.isContentLocker
      ? result.offer.offerUrl
      : buildRedirectTargetUrl(result.offer.offerUrl, slug);
    return buildRedirectResponse(finalUrl, origin, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return new NextResponse('Redirect failed', { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────
// 8. CORS preflight
// ────────────────────────────────────────────────────────────────
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || null;
  const corsHeaders = getCorsHeaders(origin);
  const response = new NextResponse(null, { status: 204 });
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Referer, Origin'
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}