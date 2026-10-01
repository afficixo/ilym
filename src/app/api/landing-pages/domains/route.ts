import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
import {
  DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS,
  deserializeLandingPageDomain,
  serializeLandingPageDomain,
} from '@/lib/utils/landing-page-host'

const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const domainSettingSchema = z.object({
  domain: z.string().trim().toLowerCase().regex(hostnamePattern, 'Enter a valid root domain without a protocol.'),
  includeProtocol: z.boolean(),
})
const domainsSchema = z.object({
  domains: z.array(domainSettingSchema)
    .min(1, 'At least one landing page domain is required.')
    .max(10, 'You can configure up to 10 landing page domains.'),
}).superRefine(({ domains }, context) => {
  const domainNames = domains.map(({ domain }) => domain)
  if (new Set(domainNames).size !== domainNames.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Domains must be unique.', path: ['domains'] })
  }
})

async function getAuthenticatedUser(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get('cookie') || '')
  return token ? getUserFromToken(token) : null
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const settings = await prisma.landingDomainSettings.findUnique({
      where: { id: 'default' },
      select: { domains: true },
    })
    const domains = settings?.domains ?? DEFAULT_LANDING_PAGE_DOMAIN_SETTINGS.map(({ domain }) => domain)
    return NextResponse.json({ domains: domains.map(deserializeLandingPageDomain) })
  } catch (error) {
    console.error('Error fetching landing page domains:', error)
    return NextResponse.json({ error: 'Failed to fetch landing page domains' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isOwner(user)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  try {
    const result = domainsSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid domains' }, { status: 400 })
    }

    const settings = await prisma.landingDomainSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        domains: result.data.domains.map(serializeLandingPageDomain),
      },
      update: {
        domains: result.data.domains.map(serializeLandingPageDomain),
      },
      select: { domains: true },
    })
    return NextResponse.json({ domains: settings.domains.map(deserializeLandingPageDomain) })
  } catch (error) {
    console.error('Error saving landing page domains:', error)
    return NextResponse.json({ error: 'Failed to save landing page domains' }, { status: 500 })
  }
}