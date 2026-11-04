import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { getUserFromToken, getTokenFromCookie, isAdminOrOwner, getOwnerUserId } from '@/lib/auth';
import { getCorsHeaders } from '@/config/cors';
import { getLinkAccountVisibilityWhereClause } from '@/lib/utils/link-account-access';

interface FilterParams {
  country?: string;
  browser?: string;
  deviceType?: string;
  isUnique?: boolean;
  isBot?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Allowed sort columns (prevent injection)
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'ipAddress',
  'country',
  'browser',
  'deviceType',
  'isUnique',
  'isBot',
  'botScore',
];

const DEFAULT_SORT = 'createdAt';
const DEFAULT_ORDER = 'desc';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_OFFSET = 1000000; // Prevent offset-based DoS attacks

// ========== HELPERS ==========

const parseBooleanParam = (value: string | null): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseIntParam = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const validateSortBy = (value: string): string => {
  return ALLOWED_SORT_COLUMNS.includes(value) ? value : DEFAULT_SORT;
};

// ========== MAIN HANDLER ==========

export async function GET(request: Request) {
  try {
    const origin = request.headers.get('origin') || null;
    const cookieHeader = request.headers.get('cookie') || '';
    const token = getTokenFromCookie(cookieHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }

    const url = new URL(request.url);

    // Parse and validate parameters
    const params: FilterParams = {
      country: url.searchParams.get('country') || undefined,
      browser: url.searchParams.get('browser') || undefined,
      deviceType: url.searchParams.get('deviceType') || undefined,
      isUnique: parseBooleanParam(url.searchParams.get('isUnique')),
      isBot: parseBooleanParam(url.searchParams.get('isBot')),
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: Math.max(1, parseIntParam(url.searchParams.get('page'), DEFAULT_PAGE)),
      limit: Math.min(MAX_LIMIT, Math.max(1, parseIntParam(url.searchParams.get('limit'), DEFAULT_LIMIT))),
      sortBy: validateSortBy(url.searchParams.get('sortBy') || DEFAULT_SORT),
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || DEFAULT_ORDER,
    };

    // Validate offset doesn't exceed MAX_OFFSET to prevent DoS
    const offset = (params.page - 1) * params.limit;
    if (offset > MAX_OFFSET) {
      return NextResponse.json(
        { error: 'Page number exceeds maximum limit' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Get all link IDs for the user
    const ownerUserId = await getOwnerUserId();
    const linkWhere = getLinkAccountVisibilityWhereClause(user, ownerUserId) as Prisma.LinkAccountWhereInput;

    const links = await prisma.linkAccount.findMany({
      where: linkWhere,
      select: { id: true },
    });

    const linkIds = links.map((link) => link.id);

    if (linkIds.length === 0) {
      return NextResponse.json(
        {
          clicks: [],
          total: 0,
          page: params.page,
          totalPages: 0,
        },
        { headers: getCorsHeaders(origin) }
      );
    }

    // Build filter
    const where: any = {
      linkAccountId: { in: linkIds },
    };

    if (params.country) where.country = params.country;
    if (params.browser) where.browser = params.browser;
    if (params.deviceType) where.deviceType = params.deviceType;
    if (params.isUnique !== undefined) where.isUnique = params.isUnique;
    // Keep automated traffic out of the default click log while preserving
    // explicit isBot=true/false requests for API consumers.
    where.isBot = params.isBot ?? false;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        const startDate = new Date(params.startDate);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid startDate format. Use YYYY-MM-DD' },
            { status: 400, headers: getCorsHeaders(origin) }
          );
        }
        where.createdAt.gte = startDate;
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate + 'T23:59:59');
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid endDate format. Use YYYY-MM-DD' },
            { status: 400, headers: getCorsHeaders(origin) }
          );
        }
        where.createdAt.lte = endDate;
      }
    }

    if (params.search) {
      where.OR = [
        { ipAddress: { contains: params.search, mode: 'insensitive' } },
        { country: { contains: params.search, mode: 'insensitive' } },
        { referrer: { contains: params.search, mode: 'insensitive' } },
        { browser: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Count total
    const total = await prisma.click.count({ where });

    // Fetch clicks with pagination
    const clicks = await prisma.click.findMany({
      where,
      orderBy: [
        { [params.sortBy]: params.sortOrder },
        { id: 'asc' },
      ],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true,
        ipAddress: true,
        country: true,
        region: true,
        city: true,
        isp: true,
        referrer: true,
        browser: true,
        browserVersion: true,
        os: true,
        deviceType: true,
        deviceBrand: true,
        userAgent: true,
        isUnique: true,
        isBot: true,
        botScore: true,
        createdAt: true,
        linkAccountId: true,
        linkAccount: {
          select: {
            accountName: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        clicks,
        total,
        page: params.page,
        totalPages: Math.ceil(total / params.limit),
      },
      { headers: getCorsHeaders(origin) }
    );
  } catch (error) {
    console.error('Error fetching clicks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clicks' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
}

// ========== DELETE ==========

export async function DELETE(request: Request) {
  try {
    const origin = request.headers.get('origin') || null;
    const cookieHeader = request.headers.get('cookie') || '';
    const token = getTokenFromCookie(cookieHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }

    if (!isAdminOrOwner(user)) {
      return NextResponse.json(
        { error: 'Only admins and the owner can delete click logs' },
        { status: 403, headers: getCorsHeaders(origin) }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Click id required' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Fetch the click with its link account
    const click = await prisma.click.findUnique({
      where: { id },
      include: {
        linkAccount: true,
      },
    });

    if (!click) {
      return NextResponse.json(
        { error: 'Click not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      );
    }

    // Delete click and update link stats in a transaction
    await prisma.$transaction([
      prisma.click.delete({
        where: { id },
      }),
      prisma.linkAccount.update({
        where: { id: click.linkAccountId },
        data: {
          totalClicks: { decrement: 1 },
          ...(click.isUnique ? { uniqueClicks: { decrement: 1 } } : {}),
          ...(click.isBot ? { botClicks: { decrement: 1 } } : {}),
        },
      }),
    ]);

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    );
  } catch (error) {
    console.error('Error deleting click:', error);
    return NextResponse.json(
      { error: 'Failed to delete click' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
}

// ========== CORS PREFLIGHT ==========

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Origin');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}