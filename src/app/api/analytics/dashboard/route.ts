import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { getUserFromToken, getTokenFromCookie, isAdmin, isOwner, isManager, getOwnerUserId } from '@/lib/auth';
import { getCorsHeaders } from '@/config/cors';
import { buildAccountGeoReport } from '@/lib/utils/report-data';
import { getLinkAccountVisibilityWhereClause } from '@/lib/utils/link-account-access';
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile';
import { filterDashboardClicks } from '@/lib/utils/dashboard-metrics';

type Period = 'all' | 'week' | 'month' | 'year' | 'weekly' | 'monthly';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface DateRange {
  startDate: Date;
  endDate: Date;
  labels: string[];
  bucketCount: number;
  granularity: Granularity;
}

interface ClickRecord {
  linkAccountId: string;
  country: string | null;
  browser: string | null;
  deviceType: string | null;
  referrer: string | null;
  createdAt: Date;
  isUnique: boolean;
  isBot: boolean;
  ipAddress: string | null; // Added: for unique visitor counting
}

interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  granularity?: Granularity;
  clickType?: string;
}

const isValidGranularity = (value: string | null | undefined): value is Granularity =>
  ['daily', 'weekly', 'monthly', 'yearly'].includes(value || '');

// ========== HELPERS ==========

const getDateRange = (period: Period, filters: DashboardFilters = {}): DateRange => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date(now);
  let bucketCount = 7;
  let labels: string[] = [];

  const granularity = filters.granularity || (period === 'all' ? 'monthly' : period === 'year' ? 'yearly' : period === 'month' ? 'monthly' : 'daily');
  const groupByWeekly = granularity === 'weekly';
  const groupByMonthly = granularity === 'monthly' || granularity === 'yearly';

  if (filters.startDate || filters.endDate) {
    if (filters.startDate) {
      const parsed = new Date(filters.startDate);
      if (!Number.isNaN(parsed.getTime())) {
        startDate = new Date(parsed);
        startDate.setHours(0, 0, 0, 0);
      }
    }

    if (filters.endDate) {
      const parsedEnd = new Date(filters.endDate);
      if (!Number.isNaN(parsedEnd.getTime())) {
        endDate.setTime(parsedEnd.getTime());
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const diffDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));

    // Prevent unbounded date ranges
    const MAX_DATE_RANGE_DAYS = 1825; // ~5 years
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw new Error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days (~5 years). Requested ${diffDays} days.`);
    }

    if (groupByWeekly) {
      bucketCount = Math.max(1, Math.ceil((diffDays + 1) / 7));
      labels = Array.from({ length: bucketCount }, (_, i) => {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        if (weekEnd > endDate) {
          weekEnd.setTime(endDate.getTime());
        }
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      });
    } else if (groupByMonthly) {
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      bucketCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      labels = Array.from({ length: bucketCount }, (_, i) => {
        const d = new Date(startDate);
        d.setMonth(startMonth + i);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      });
    } else {
      bucketCount = diffDays + 1;
      labels = Array.from({ length: bucketCount }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
    }
  } else if (period === 'all') {
    // Show all historical data from actual earliest click date
    // Will be populated after fetching clicks, for now set to 5 years back
    // This gets recalculated in the main handler
    startDate = new Date(now.getTime() - 1825 * 86400000);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 1; // Placeholder, will be recalculated after fetching data
    labels = ['Loading...'];
  } else if (groupByWeekly) {
    startDate.setDate(startDate.getDate() - 6 * 7);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 7;
    labels = Array.from({ length: bucketCount }, (_, i) => {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    });
  } else if (groupByMonthly) {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 12;
    labels = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
  } else if (period === 'month') {
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 30;
    labels = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 12;
    labels = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
  } else {
    // week
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    bucketCount = 7;
    labels = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }

  return { startDate, endDate, labels, bucketCount, granularity };
};

const getBucketIndex = (clickDate: Date, startDate: Date, dateRange: DateRange): number => {
  const { bucketCount, granularity } = dateRange;
  const diffMs = clickDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (granularity === 'weekly') {
    return Math.min(bucketCount - 1, Math.max(0, Math.floor(diffDays / 7)));
  }

  if (granularity === 'monthly' || granularity === 'yearly') {
    const diffMonths = (clickDate.getFullYear() - startDate.getFullYear()) * 12 +
      (clickDate.getMonth() - startDate.getMonth());
    return Math.min(bucketCount - 1, Math.max(0, diffMonths));
  }

  return Math.min(bucketCount - 1, Math.max(0, diffDays));
};

const aggregateClicks = (clicks: ClickRecord[], period: Period, dateRange: DateRange) => {
  const { startDate, bucketCount } = dateRange;
  const trendValues = Array(bucketCount).fill(0);
  const uniqueTrendValues = Array(bucketCount).fill(0);
  const geoMap = new Map<string, { clicks: number; uniqueClicks: number; uniqueIPs: Set<string> }>();
  const geoSeriesMap = new Map<string, number[]>();
  const referrerMap = new Map<string, { clicks: number; uniqueClicks: number; uniqueIPs: Set<string> }>();
  const browserMap = new Map<string, { clicks: number; uniqueClicks: number; uniqueIPs: Set<string> }>();
  const deviceMap = new Map<string, { clicks: number; uniqueClicks: number; uniqueIPs: Set<string> }>();
  const uniqueIPsPerBucket = Array(bucketCount).fill(0).map(() => new Set<string>()); // Track unique IPs per time bucket

  clicks.forEach((click) => {
    const clickDate = new Date(click.createdAt);
    const bucketIndex = getBucketIndex(clickDate, startDate, dateRange);
    const ipAddress = (click.ipAddress || '').trim();

    trendValues[bucketIndex] += 1;
    
    // CRITICAL FIX: Count unique by distinct IP, not by isUnique flag
    // Add IP to this bucket's unique set if it's a valid IP
    if (ipAddress && ipAddress !== '') {
      uniqueIPsPerBucket[bucketIndex].add(ipAddress);
      uniqueTrendValues[bucketIndex] = uniqueIPsPerBucket[bucketIndex].size;
    }

    const country = (click.country || '').trim();
    if (country) {
      const current = geoMap.get(country) || { clicks: 0, uniqueClicks: 0, uniqueIPs: new Set<string>() };
      current.clicks += 1;
      if (ipAddress && ipAddress !== '') {
        current.uniqueIPs.add(ipAddress);
        current.uniqueClicks = current.uniqueIPs.size; // Update count based on unique IPs
      }
      geoMap.set(country, current);

      const series = geoSeriesMap.get(country) || Array(bucketCount).fill(0);
      series[bucketIndex] += 1;
      geoSeriesMap.set(country, series);
    }

    const referrer = (click.referrer || 'Direct').trim() || 'Direct';
    const rCurrent = referrerMap.get(referrer) || { clicks: 0, uniqueClicks: 0, uniqueIPs: new Set<string>() };
    rCurrent.clicks += 1;
    if (ipAddress && ipAddress !== '') {
      rCurrent.uniqueIPs.add(ipAddress);
      rCurrent.uniqueClicks = rCurrent.uniqueIPs.size;
    }
    referrerMap.set(referrer, rCurrent);

    const browser = (click.browser || 'Unknown').trim() || 'Unknown';
    const bCurrent = browserMap.get(browser) || { clicks: 0, uniqueClicks: 0, uniqueIPs: new Set<string>() };
    bCurrent.clicks += 1;
    if (ipAddress && ipAddress !== '') {
      bCurrent.uniqueIPs.add(ipAddress);
      bCurrent.uniqueClicks = bCurrent.uniqueIPs.size;
    }
    browserMap.set(browser, bCurrent);

    const device = (click.deviceType || 'Unknown').trim() || 'Unknown';
    const dCurrent = deviceMap.get(device) || { clicks: 0, uniqueClicks: 0, uniqueIPs: new Set<string>() };
    dCurrent.clicks += 1;
    if (ipAddress && ipAddress !== '') {
      dCurrent.uniqueIPs.add(ipAddress);
      dCurrent.uniqueClicks = dCurrent.uniqueIPs.size;
    }
    deviceMap.set(device, dCurrent);
  });

  return {
    trendValues,
    uniqueTrendValues,
    geoMap,
    geoSeriesMap,
    referrerMap,
    browserMap,
    deviceMap,
  };
};

// ========== MAIN HANDLER ==========

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || null;
  const cookieHeader = request.headers.get('cookie') || '';
  const token = getTokenFromCookie(cookieHeader);

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: getCorsHeaders(origin) }
    );
  }

  try {
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }

    // Local test users will follow the same data paths as real users so
    // managers and owners can exercise the dashboard/analytics behavior
    // during development. No special-case mock data is returned here.

    const url = new URL(request.url);
    const periodParam = url.searchParams.get('period') || 'week';
    const period = (['all', 'week', 'month', 'year', 'weekly', 'monthly'].includes(periodParam)
      ? periodParam
      : 'week') as Period;

    const granularityParam = url.searchParams.get('granularity');
    const filters: DashboardFilters = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      granularity: isValidGranularity(granularityParam) ? granularityParam : undefined,
      clickType: url.searchParams.get('clickType') || undefined,
    };

    const dateRange = getDateRange(period, filters);

    const ownerUserId = await getOwnerUserId();
    const defaultOwnerClickRate = ownerUserId
      ? Number((await prisma.user.findUnique({ where: { id: ownerUserId }, select: { clickRate: true } }))?.clickRate ?? 0) || 0
      : 0;
    const linkWhere = getLinkAccountVisibilityWhereClause(user, ownerUserId) as Prisma.LinkAccountWhereInput;

    let links: any[];
    try {
      links = await prisma.linkAccount.findMany({
        where: linkWhere,
        select: {
          id: true,
          accountName: true,
          botClicks: true,
          user: { select: { clickRate: true, commissionRate: true } },
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2022' || !String(error?.meta?.column || '').includes('commissionRate')) {
        throw error;
      }

      links = await prisma.linkAccount.findMany({
        where: linkWhere,
        select: {
          id: true,
          accountName: true,
          botClicks: true,
          invoices: { select: { totalEarning: true } },
          user: { select: { clickRate: true } },
        },
      });
    }

    const linkIds = links.map((l) => l.id);
    const linkAccounts = links.map((l) => ({ id: l.id, accountName: l.accountName }));

    // Early exit if no links
    if (linkIds.length === 0) {
      return NextResponse.json(
        {
          totalClicks: 0,
          uniqueClicks: 0,
          botClicks: 0,
          totalLinks: 0,
          totalEarned: 0,
          commission: 0,
          revenue: 0,
          geoData: [],
          chartData: { labels: dateRange.labels, datasets: [] },
          accountGeoReport: { labels: [], datasets: [], accountBreakdown: [] },
        },
        { headers: getCorsHeaders(origin) }
      );
    }

    // Fetch all clicks in the period
    const clickWhere: any = {
      linkAccountId: { in: linkIds },
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    if (filters.clickType === 'unique') {
      clickWhere.isUnique = true;
    } else if (filters.clickType === 'repeat') {
      clickWhere.isUnique = false;
    } else if (filters.clickType === 'direct') {
      clickWhere.OR = [{ referrer: null }, { referrer: '' }];
    } else if (filters.clickType === 'referrer') {
      clickWhere.AND = [{ referrer: { not: null } }, { referrer: { not: '' } }];
    }

    const clicks = await prisma.click.findMany({
      where: clickWhere,
      select: {
        linkAccountId: true,
        country: true,
        browser: true,
        deviceType: true,
        referrer: true,
        createdAt: true,
        isUnique: true,
        isBot: true,
        ipAddress: true, // Added: needed to count unique visitors by IP
      },
      orderBy: { createdAt: 'asc' },
      take: 100000, // Limit to prevent memory exhaustion
    });

    const visibleClicks = filterDashboardClicks(clicks, filters.clickType);

    // For all-time period, recalculate date range based on earliest click
    if (period === 'all' && visibleClicks.length > 0) {
      const earliestClick = visibleClicks[0]; // ordered by createdAt asc
      const earliestDate = new Date(earliestClick.createdAt);
      earliestDate.setHours(0, 0, 0, 0);
      
      dateRange.startDate = earliestDate;
      
      // Calculate days between earliest and now
      const diffMs = dateRange.endDate.getTime() - earliestDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      
      // Use smart grouping: daily for < 365 days, weekly for < 1825 days, monthly for longer
      if (diffDays <= 365) {
        dateRange.bucketCount = diffDays + 1;
        dateRange.granularity = 'daily';
        dateRange.labels = Array.from({ length: dateRange.bucketCount }, (_, i) => {
          const d = new Date(earliestDate);
          d.setDate(earliestDate.getDate() + i);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
      } else if (diffDays <= 1825) {
        dateRange.bucketCount = Math.ceil(diffDays / 7) + 1;
        dateRange.granularity = 'weekly';
        dateRange.labels = Array.from({ length: dateRange.bucketCount }, (_, i) => {
          const d = new Date(earliestDate);
          d.setDate(earliestDate.getDate() + i * 7);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
      } else {
        const startMonth = earliestDate.getMonth();
        const startYear = earliestDate.getFullYear();
        const endMonth = dateRange.endDate.getMonth();
        const endYear = dateRange.endDate.getFullYear();
        dateRange.bucketCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        dateRange.granularity = 'monthly';
        dateRange.labels = Array.from({ length: dateRange.bucketCount }, (_, i) => {
          const d = new Date(startYear, startMonth + i, 1);
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
      }
    }

    // Aggregate only visible human traffic by default; bot totals remain available separately.
    const aggregated = aggregateClicks(visibleClicks, period, dateRange);

    const totalClicks = visibleClicks.length;
    // CRITICAL FIX: Count unique visitors by distinct IP addresses, not by isUnique flag
    // Same IP = same visitor, regardless of fingerprint changes
    const uniqueIPs = new Set(visibleClicks.map((c) => c.ipAddress).filter((ip) => ip && ip.trim() !== ''));
    const uniqueClicks = uniqueIPs.size;
    const botClicks = links.reduce((total, link) => total + (link.botClicks || 0), 0);

    const linkRateById = new Map(links.map((link) => {
      const managerClickRate = Number(link.user?.clickRate ?? 0) || 0;
      const clickRate = managerClickRate > 0 ? managerClickRate : defaultOwnerClickRate;
      return [
        link.id,
        {
          clickRate,
          commissionRate: Number(link.user?.commissionRate ?? 20) || 20,
        },
      ];
    }));
    const qualifiedClicks = await prisma.click.findMany({
      where: {
        linkAccountId: { in: linkIds },
        isUnique: true,
        isBot: false,
      },
      select: { linkAccountId: true, country: true, referrer: true, deviceType: true },
    });
    const qualifiedClickMap = new Map<string, number>();
    for (const click of qualifiedClicks) {
      const isUsClick = (click.country || '').trim().toUpperCase() === 'US';
      if (!isUsClick) continue;
      qualifiedClickMap.set(click.linkAccountId, (qualifiedClickMap.get(click.linkAccountId) || 0) + 1);
    }
    const revenueByLink = links.map((link) => {
      const rates = linkRateById.get(link.id) || { clickRate: 0, commissionRate: 20 };
      const current = (qualifiedClickMap.get(link.id) || 0) * rates.clickRate;
      const totalEarned = current;
      return { totalEarned, commission: totalEarned * (rates.commissionRate / 100) };
    });
    const totalEarned = revenueByLink.reduce((sum, item) => sum + item.totalEarned, 0);
    const commission = revenueByLink.reduce((sum, item) => sum + item.commission, 0);

    const countryBreakdown = Array.from(aggregated.geoMap.entries())
      .map(([country, values]) => ({ name: country, ...values }))
      .sort((a, b) => b.clicks - a.clicks);

    const referrerBreakdown = Array.from(aggregated.referrerMap.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);

    const browserBreakdown = Array.from(aggregated.browserMap.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);

    const deviceBreakdown = Array.from(aggregated.deviceMap.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);

    // Top 5 countries for geoData
    const geoData = countryBreakdown.slice(0, 5);

    // Highlighted countries (top 3 for chart)
    const highlightedCountries = countryBreakdown.slice(0, 3);
    const countryColors = ['#38BDF8', '#F59E0B', '#F472B6'];
    const geoDatasets = highlightedCountries.map((countryItem, index) => ({
      label: countryItem.name,
      data: aggregated.geoSeriesMap.get(countryItem.name) || Array(dateRange.bucketCount).fill(0),
      borderColor: countryColors[index % countryColors.length],
      backgroundColor: `${countryColors[index % countryColors.length]}22`,
      fill: false,
      tension: 0.35,
      pointRadius: 2,
    }));

    // Build chart data
    const chartData = {
      labels: dateRange.labels,
      datasets: [
        {
          label: 'Clicks',
          data: aggregated.trendValues,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Unique Visitors',
          data: aggregated.uniqueTrendValues,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        // Only include country breakdown for non-all-time views to keep chart clean
        ...(period !== 'all' ? geoDatasets : []),
      ],
    };

    // Keep account reporting aligned with actual visible traffic: count all non-bot clicks normally.
    const accountReportClicks = visibleClicks.filter((click) => !click.isBot);
    const accountGeoReport = buildAccountGeoReport(accountReportClicks, linkAccounts);

    return NextResponse.json(
      {
        totalClicks,
        uniqueClicks,
        botClicks,
        totalLinks: links.length,
        totalEarned,
        commission,
        revenue: totalEarned + commission,
        countryBreakdown,
        geoData,
        referrerBreakdown,
        browserBreakdown,
        deviceBreakdown,
        chartData,
        accountGeoReport,
      },
      { headers: getCorsHeaders(origin) }
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}