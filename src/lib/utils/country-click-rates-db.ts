import { prisma } from '@/lib/db/prisma'

export async function getCountryClickRatesByUserIds(userIds: string[]) {
  const ratesByUserId = new Map<string, Array<{ countryCode: string; rate: number }>>()
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (!uniqueUserIds.length) return { ratesByUserId, available: true }

  try {
    const rates = await prisma.countryClickRate.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: { userId: true, countryCode: true, rate: true },
    })
    for (const rate of rates) {
      const userRates = ratesByUserId.get(rate.userId) || []
      userRates.push({ countryCode: rate.countryCode, rate: Number(rate.rate) })
      ratesByUserId.set(rate.userId, userRates)
    }
    return { ratesByUserId, available: true }
  } catch (error) {
    const databaseError = error as { code?: string; meta?: { table?: string } }
    if (
      databaseError.code === 'P2021' &&
      String(databaseError.meta?.table || '').includes('country_click_rates')
    ) {
      return { ratesByUserId, available: false }
    }
    throw error
  }
}
