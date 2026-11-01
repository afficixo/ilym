import { countries } from 'country-flag-icons'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  CA: '🇨🇦',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷',
  JP: '🇯🇵',
  CN: '🇨🇳',
  IN: '🇮🇳',
  BR: '🇧🇷',
  RU: '🇷🇺',
  ZA: '🇿🇦',
  ES: '🇪🇸',
  IT: '🇮🇹',
  MX: '🇲🇽',
  KR: '🇰🇷',
  NL: '🇳🇱',
  AE: '🇦🇪',
  SG: '🇸🇬',
  SE: '🇸🇪',
  NZ: '🇳🇿',
  TR: '🇹🇷',
  ID: '🇮🇩',
  PH: '🇵🇭',
  BD: '🇧🇩',
  UA: '🇺🇦',
  PL: '🇵🇱',
  AR: '🇦🇷',
  CH: '🇨🇭',
  NG: '🇳🇬',
  MY: '🇲🇾',
  TH: '🇹🇭',
  VN: '🇻🇳',
  HK: '🇭🇰',
  IE: '🇮🇪',
  PT: '🇵🇹',
  PK: '🇵🇰',
  EG: '🇪🇬',
  RO: '🇷🇴',
  CZ: '🇨🇿',
  GR: '🇬🇷',
  BE: '🇧🇪',
  AT: '🇦🇹',
  NO: '🇳🇴',
  FI: '🇫🇮',
  DK: '🇩🇰',
  HU: '🇭🇺',
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  'u.k.': 'GB',
  'great britain': 'GB',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  japan: 'JP',
  china: 'CN',
  india: 'IN',
  brazil: 'BR',
  russia: 'RU',
  'russian federation': 'RU',
  'south africa': 'ZA',
  spain: 'ES',
  italy: 'IT',
  mexico: 'MX',
  'south korea': 'KR',
  'republic of korea': 'KR',
  'korea republic of': 'KR',
  netherlands: 'NL',
  'united arab emirates': 'AE',
  uae: 'AE',
  singapore: 'SG',
  sweden: 'SE',
  'new zealand': 'NZ',
  turkey: 'TR',
  indonesia: 'ID',
  philippines: 'PH',
  bangladesh: 'BD',
  ukraine: 'UA',
  poland: 'PL',
  argentina: 'AR',
  switzerland: 'CH',
  nigeria: 'NG',
  malaysia: 'MY',
  thailand: 'TH',
  vietnam: 'VN',
  'hong kong': 'HK',
  ireland: 'IE',
  portugal: 'PT',
  pakistan: 'PK',
  egypt: 'EG',
  romania: 'RO',
  czechia: 'CZ',
  'czech republic': 'CZ',
  greece: 'GR',
  belgium: 'BE',
  austria: 'AT',
  norway: 'NO',
  finland: 'FI',
  denmark: 'DK',
  hungary: 'HU',
}

const COUNTRY_LABELS: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  RU: 'Russia',
  ZA: 'South Africa',
  ES: 'Spain',
  IT: 'Italy',
  MX: 'Mexico',
  KR: 'South Korea',
  NL: 'Netherlands',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  SE: 'Sweden',
  NZ: 'New Zealand',
  TR: 'Turkey',
  ID: 'Indonesia',
  PH: 'Philippines',
  BD: 'Bangladesh',
  UA: 'Ukraine',
  PL: 'Poland',
  AR: 'Argentina',
  CH: 'Switzerland',
  NG: 'Nigeria',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  HK: 'Hong Kong',
  IE: 'Ireland',
  PT: 'Portugal',
  PK: 'Pakistan',
  EG: 'Egypt',
  RO: 'Romania',
  CZ: 'Czechia',
  GR: 'Greece',
  BE: 'Belgium',
  AT: 'Austria',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  HU: 'Hungary',
}

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryCodes = Object.values(countries).flat()
export const COUNTRY_OPTIONS = countryCodes
  .filter((code) => /^[A-Z]{2}$/.test(code))
  .map((code) => ({ code, name: countryDisplayNames.of(code) || code }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function normalizeCountryCode(country?: string | null): string | null {
  if (!country) return null

  const trimmed = country.trim()
  if (!trimmed) return null

  const normalized = trimmed.toUpperCase().replace(/[^A-Z]/g, '')
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized
  }

  const normalizedName = trimmed
    .toLowerCase()
    .replace(/[\.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return COUNTRY_NAME_TO_CODE[normalizedName] || null
}

export function getCountryFlag(country?: string | null): string {
  const normalizedCode = normalizeCountryCode(country)
  if (!normalizedCode) return '🌍'

  return COUNTRY_FLAGS[normalizedCode] || '🌍'
}

export function getCountryLabel(country?: string | null): string {
  if (!country) return ''

  const trimmed = country.trim()
  if (!trimmed) return ''

  const upper = trimmed.toUpperCase()
  if (upper === 'UNKNOWN' || upper === 'N/A' || upper === 'NULL') {
    return ''
  }

  const normalizedCode = normalizeCountryCode(trimmed)
  if (!normalizedCode) return trimmed

  return COUNTRY_LABELS[normalizedCode] || countryDisplayNames.of(normalizedCode) || trimmed
}
