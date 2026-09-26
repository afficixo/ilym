import { NextResponse, type NextRequest } from 'next/server';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { BotDetectionService } from '@/lib/services/bot-detection';
import { buildClickFingerprint, getClickDedupeWindowMs, isDuplicateClickEvent } from '@/lib/services/click-detection';
import { getGeoLocation } from '@/lib/services/geo/ip2location';
import { buildRedirectTargetUrl } from '@/lib/utils/redirect';
import { parseVisitorProfile } from '@/lib/utils/visitor-profile';
import { getOfferSelectionUserIds, getOwnerUserId } from '@/lib/auth';
import { selectOffer as selectOfferFromVault } from '@/lib/utils/offer-selection';
import { decideSecretRedirectInTransaction, getSecretRedirectFallbackUrl } from '@/lib/utils/secret-redirect';
import { getCorsHeaders, isOriginAllowed } from '@/config/cors';

const normalizeGroupName = (value?: string | null) => value?.trim() ?? '';

// ─── OFFER TYPES ──────────────────────────────────────────────────

type Offer = {
  id: string;
  priority: number;
  rotationMode: string;
  offerUrl: string;
  country: string;
  isGlobal: boolean;
  isContentLocker: boolean;
  isActive: boolean;
  createdAt: Date;
  groupName: string | null;
  usaSecretRedirectEnabled: boolean; // added this field
  usaSecretRedirectPercentage?: number;
};

// ─── OFFER SELECTION ──────────────────────────────────────────────

const selectRotatingOffer = (offers: Offer[]): Offer | null => {
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

const selectGroupOfferForUser = async (
  tx: any,
  userId: string,
  country: string,
  groupName: string
): Promise<Offer | null> => {
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

const selectOfferForUser = async (
  tx: any,
  userId: string,
  country: string,
  linkGroupName: string | null
): Promise<Offer | null> => {
  let offer: Offer | null = null;

  if (linkGroupName) {
    offer = await selectGroupOfferForUser(tx, userId, country, linkGroupName);
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
  return offer;
};

const selectOffer = async (
  tx: any,
  userIds: string[],
  country: string,
  linkGroupName: string | null
): Promise<Offer | null> => {
  for (const userId of userIds) {
    const offer = await selectOfferForUser(tx, userId, country, linkGroupName);
    if (offer) return offer;
  }
  return null;
};

// ─── HELPERS ──────────────────────────────────────────────────────

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
  response.headers.set('Vary', 'Origin');
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
};

// ─── MAIN HANDLER ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const headers = request.headers;
    const ip = getClientIp(headers);
    const userAgent = headers.get('user-agent') || '';
    const referrer = headers.get('referer') || '';
    const origin = headers.get('origin') || '';
    const visitorProfile = parseVisitorProfile(userAgent);

    // ── 1. Validate link with the smallest possible payload ─────
    const link = await prisma.linkAccount.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        isActive: true,
        offerGroupName: true,
        totalClicks: true,
      },
    });

    if (!link || !link.isActive) {
      return new NextResponse('Link not found', { status: 404 });
    }

    // ── 2. Build fingerprint ──────────────────────────────────────
    const clickFingerprint = buildClickFingerprint({
      linkId: link.id,
      ipAddress: ip,
      userAgent,
      browser: visitorProfile.browser,
      os: visitorProfile.os,
      deviceType: visitorProfile.deviceType,
    });

    const botService = new BotDetectionService();
    const botResult = await botService.detect(userAgent, ip);

    if (botResult.isBot) {
      await prisma.$transaction(async (tx) => {
        await logBotClick(tx, link.id);
      });

      let botUser: { botFallbackUrl?: string | null } | null = null
      try {
        botUser = await prisma.user.findUnique({
          where: { id: link.userId },
          select: { botFallbackUrl: true },
        })
      } catch (error: any) {
        const missingColumn = String(error?.meta?.column || '') + ' ' + String(error?.message || '')
        if (error?.code === 'P2022' && missingColumn.includes('botFallbackUrl')) {
          botUser = null
        } else {
          throw error
        }
      }

      const fallbackUrl = botUser?.botFallbackUrl?.trim() || 'https://app.hawktrk.com/sl?id=6a2050db46d3cf0d62f32aa4&pid=2&sub2=u811439&sub6=s2smartLink&sub5=winner';
      return NextResponse.redirect(fallbackUrl, { status: 302 });
    }

    // ── 3. Run only the expensive checks that real users need ────
    let geo;
    let offerUserIds: string[] = [];

    try {
      [geo, offerUserIds] = await Promise.all([
        getGeoLocation(ip, headers),
        getOfferSelectionUserIds(link.userId),
      ]);
    } catch (error) {
      console.error('[API REDIRECT] Failed to preflight redirect checks:', error);
      return new NextResponse('Failed to process link', { status: 500 });
    }

    const fallbackCountry = (process.env.GEO_DEFAULT_COUNTRY || 'US').trim().toUpperCase();
    const resolvedGeoCountry = geo?.country_code?.trim().toUpperCase();
    const country = /^[A-Z]{2}$/.test(resolvedGeoCountry || '') ? resolvedGeoCountry! : fallbackCountry;

    const dedupeWindowMs = getClickDedupeWindowMs();

    let offer;
    try {
      offer = await selectOfferFromVault(prisma as any, offerUserIds, country, link.offerGroupName);
    } catch (error) {
      console.error('[API REDIRECT] Failed to select offer:', error);
      return new NextResponse('Failed to select offer', { status: 500 });
    }
    
    if (!offer) {
      return new NextResponse('No owner offer found', { status: 404 });
    }
    
    // ── 6. Main transaction: click logging ────
    const result = await prisma.$transaction(async (tx) => {
      await acquireDedupeLocks(tx, clickFingerprint, ip, userAgent);

      // ── 6a. Re‑check duplicate under lock ──
      // CRITICAL: Check for duplicate by IP first (same IP = same visitor)
      // Then fall back to fingerprint/UA matching
      const recentWindowStart = new Date(Date.now() - dedupeWindowMs);

      const existing = await tx.click.findFirst({
        where: {
          linkAccountId: link.id,
          OR: [
            // Same IP counts as a duplicate only within the dedupe window.
            ...(ip && ip !== 'unknown' ? [{
              AND: [
                { ipAddress: ip },
                { createdAt: { gte: recentWindowStart } },
              ],
            }] : []),
            // Exact fingerprint within the short dedupe window.
            {
              AND: [
                { clickSignature: clickFingerprint },
                { createdAt: { gte: recentWindowStart } },
              ],
            },
            // Same user-agent within the short dedupe window.
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

      const isSecret = await decideSecretRedirectInTransaction(tx, offer, country);

      // ── 6b. Log click if not duplicate ──
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

      return { offer, shouldRedirect: true, isSecret };
    });

    // ── 7. Build and return redirect response ────────────────────
    const finalUrl = result.isSecret
      ? getSecretRedirectFallbackUrl()
      : result.offer.isContentLocker
        ? result.offer.offerUrl
        : buildRedirectTargetUrl(result.offer.offerUrl, slug);
    return buildRedirectResponse(finalUrl, origin, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return new NextResponse('Redirect failed', { status: 500 });
  }
}

// ─── CORS PREFLIGHT ──────────────────────────────────────────────

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || null;
  const corsHeaders = getCorsHeaders(origin);
  const response = new NextResponse(null, { status: 204 });
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Referer, Origin');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}