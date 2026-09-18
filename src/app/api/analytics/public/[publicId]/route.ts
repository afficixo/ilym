import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCorsHeaders } from '@/config/cors';

// ========== HELPERS ==========

const getRangeDays = (range: string = '7d'): number => {
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return 7;
};

const getTrendDays = (days: number = 7): Array<{ key: string; label: string }> => {
  const result: Array<{ key: string; label: string }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    result.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }

  return result;
};

const aggregateGeoData = (
  rows: Array<{ country: string | null; isUnique: boolean }>
): Array<{ country: string; totalClicks: number; uniqueClicks: number }> => {
  const geoMap = new Map<string, { totalClicks: number; uniqueClicks: number }>();

  rows.forEach((row) => {
    const country = row.country?.trim();
    if (!country) return;

    const current = geoMap.get(country) || { totalClicks: 0, uniqueClicks: 0 };
    current.totalClicks += 1;
    if (row.isUnique) current.uniqueClicks += 1;
    geoMap.set(country, current);
  });

  return Array.from(geoMap.entries())
    .map(([country, stats]) => ({ country, ...stats }))
    .sort((a, b) => b.uniqueClicks - a.uniqueClicks || b.totalClicks - a.totalClicks);
};

const buildWhereClause = (
  linkAccountId: string,
  search?: string,
  country?: string,
  unique?: string,
  referrer?: string,
  range: string = '7d'
) => {
  const baseWhere: any = { linkAccountId };

  if (search) {
    baseWhere.OR = [
      { ipAddress: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
      { browser: { contains: search, mode: 'insensitive' } },
      { browserVersion: { contains: search, mode: 'insensitive' } },
      { os: { contains: search, mode: 'insensitive' } },
      { deviceType: { contains: search, mode: 'insensitive' } },
      { deviceBrand: { contains: search, mode: 'insensitive' } },
      { referrer: { contains: search, mode: 'insensitive' } },
      { userAgent: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (country) {
    baseWhere.country = country;
  }

  if (unique === 'true' || unique === 'unique') {
    baseWhere.isUnique = true;
  } else if (unique === 'false' || unique === 'repeat') {
    baseWhere.isUnique = false;
  }

  if (referrer === 'direct') {
    baseWhere.AND = [
      {
        OR: [
          { referrer: null },
          { referrer: '' },
        ],
      },
    ];
  } else if (referrer === 'referrer') {
    baseWhere.AND = [
      { referrer: { not: null } },
      { referrer: { not: '' } },
    ];
  }

  const days = getRangeDays(range);
  if (days > 0) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    baseWhere.createdAt = { gte: from };
  }

  return baseWhere;
};

// ========== MAIN HANDLER ==========

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const origin = request.headers.get('origin') || null;

  try {
    const { publicId } = await params;

    const dashboard = await prisma.publicDashboard.findUnique({
      where: { publicId },
      include: {
        linkAccount: {
          include: {
            user: { select: { clickRate: true } },
          },
        },
      },
    });

    if (!dashboard || dashboard.isPrivate) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        {
          status: 404,
          headers: {
            ...getCorsHeaders(origin),
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const search = url.searchParams.get('search') || '';
    const country = url.searchParams.get('country') || '';
    const unique = url.searchParams.get('unique') || '';
    const referrer = url.searchParams.get('referrer') || '';
    const range = url.searchParams.get('range') || '7d';

    const baseWhere = buildWhereClause(dashboard.linkAccountId, search, country, unique, referrer, range);

    const visibleWhere = { ...baseWhere, isBot: false };

    // Get total counts
    const [totalClicks, uniqueClicks] = await Promise.all([
      prisma.click.count({ where: visibleWhere }),
      prisma.click.count({ where: { ...visibleWhere, isUnique: true } }),
    ]);
    const botClicks = dashboard.linkAccount.botClicks;

    // Get paginated clicks
    const clicks = await prisma.click.findMany({
      where: visibleWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        ipAddress: true,
        country: true,
        region: true,
        city: true,
        isp: true,
        browser: true,
        browserVersion: true,
        os: true,
        deviceType: true,
        deviceBrand: true,
        referrer: true,
        userAgent: true,
        isUnique: true,
        isBot: true,
        createdAt: true,
        timestamp: true,
      },
    });

    // Build trend data
    const trendDays = getTrendDays(getRangeDays(range));
    const trendRows = await prisma.click.findMany({
      where: visibleWhere,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, isUnique: true },
      take: 100000, // Limit to prevent memory exhaustion
    });

    const trendMap: Record<string, { total: number; unique: number }> = {};
    trendDays.forEach((day) => {
      trendMap[day.key] = { total: 0, unique: 0 };
    });

    trendRows.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].total += 1;
        if (row.isUnique) trendMap[key].unique += 1;
      }
    });

    const clickTrend = {
      labels: trendDays.map((d) => d.label),
      datasets: [
        {
          label: 'Total Clicks',
          data: trendDays.map((d) => trendMap[d.key].total),
          borderColor: '#22D3EE',
          backgroundColor: 'rgba(34, 211, 238, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Unique Clicks',
          data: trendDays.map((d) => trendMap[d.key].unique),
          borderColor: '#34D399',
          backgroundColor: 'rgba(52, 211, 153, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    };

    // Build geo summary
    const geoRows = await prisma.click.findMany({
      where: visibleWhere,
      select: { country: true, isUnique: true },
    });
    const geoSummary = aggregateGeoData(geoRows);

    return NextResponse.json(
      {
        accountName: dashboard.linkAccount?.accountName || 'Afficixo',
        totalClicks,
        uniqueClicks,
        botClicks,
        clickRate: Number(dashboard.linkAccount?.user?.clickRate ?? 0) || 0,
        payoutMethod: dashboard.linkAccount?.payoutMethod || null,
        geoSummary,
        clickTrend,
        clicks: clicks.map((c) => ({
          id: c.id,
          ipAddress: c.ipAddress,
          country: c.country || null,
          region: c.region || null,
          city: c.city || null,
          isp: c.isp || null,
          browser: c.browser || 'Unknown',
          browserVersion: c.browserVersion,
          os: c.os,
          deviceType: c.deviceType,
          deviceBrand: c.deviceBrand,
          referrer: c.referrer,
          userAgent: c.userAgent,
          isUnique: c.isUnique,
          isBot: c.isBot,
          createdAt: c.createdAt.toISOString(),
          timestamp: c.timestamp?.toISOString() || c.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total: totalClicks,
          totalPages: Math.ceil(totalClicks / limit),
        },
      },
      {
        headers: {
          ...getCorsHeaders(origin),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      {
        status: 500,
        headers: {
          ...getCorsHeaders(origin),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(origin),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}