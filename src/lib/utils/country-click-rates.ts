export interface CountryRate {
  countryCode: string
  rate: number
}

export interface CountryClickCount {
  country: string | null
  count?: number
}

export interface CountryEarnings {
  qualifiedClicks: number
  totalEarning: number
  clickRate: number
}

export function getCountryClickRate(
  country: string | null | undefined,
  countryRates: CountryRate[],
  defaultUsRate = 0,
): number | null {
  const countryCode = country?.trim().toUpperCase()
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return null

  const configuredRate = countryRates.find((item) => item.countryCode.toUpperCase() === countryCode)
  if (configuredRate) return Number(configuredRate.rate)
  if (countryCode === 'US') return Number(defaultUsRate) || 0
  return 0
}

export function calculateCountryEarnings(
  clicksByCountry: CountryClickCount[],
  countryRates: CountryRate[],
  defaultUsRate = 0,
): CountryEarnings {
  let qualifiedClicks = 0
  let totalEarning = 0

  for (const entry of clicksByCountry) {
    const rate = getCountryClickRate(entry.country, countryRates, defaultUsRate)
    if (rate === null || rate <= 0) continue

    const count = Math.max(0, Number(entry.count ?? 1) || 0)
    qualifiedClicks += count
    totalEarning += count * rate
  }

  return {
    qualifiedClicks,
    totalEarning,
    clickRate: qualifiedClicks > 0 ? totalEarning / qualifiedClicks : 0,
  }
}
