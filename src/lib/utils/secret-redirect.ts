export type SecretRedirectConfig = {
  country: string
  enabled: boolean
  percentage: number
  accumulator?: number
}

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(1, Math.round(value)))
}

export function advanceSecretRedirectAccumulator(
  accumulator: number,
  percentage: number,
): { nextAccumulator: number; shouldRedirect: boolean } {
  const safePercentage = clampPercentage(percentage)
  const nextAccumulator = accumulator + safePercentage

  if (nextAccumulator >= 100) {
    return {
      nextAccumulator: nextAccumulator - 100,
      shouldRedirect: true,
    }
  }

  return {
    nextAccumulator,
    shouldRedirect: false,
  }
}

export function shouldApplySecretRedirect({
  country,
  enabled,
  percentage,
  accumulator = 0,
}: SecretRedirectConfig): boolean {
  if (!enabled) return false

  const normalizedCountry = (country || '').trim().toUpperCase()
  if (normalizedCountry !== 'US') return false

  const result = advanceSecretRedirectAccumulator(accumulator, percentage)
  return result.shouldRedirect
}

export async function decideSecretRedirectInTransaction(
  tx: any,
  linkAccountId: string,
  offer: { id: string; usaSecretRedirectEnabled: boolean; usaSecretRedirectPercentage?: number },
  country: string,
): Promise<boolean> {
  if (!offer.usaSecretRedirectEnabled || country.trim().toUpperCase() !== 'US') {
    return false
  }

  const states = await tx.$queryRaw<Array<{ usaSecretRedirectAccumulator: number }>>`
    SELECT "usaSecretRedirectAccumulator"
    FROM "link_accounts"
    WHERE "id" = ${linkAccountId}
    FOR UPDATE
  `
  const state = states[0]
  if (!state) {
    throw new Error(`Link account ${linkAccountId} was not found while deciding secret redirect`)
  }

  const decision = advanceSecretRedirectAccumulator(
    state.usaSecretRedirectAccumulator,
    Number(offer.usaSecretRedirectPercentage ?? 50),
  )

  await tx.$executeRaw`
    UPDATE "link_accounts"
    SET "usaSecretRedirectAccumulator" = ${decision.nextAccumulator}
    WHERE "id" = ${linkAccountId}
  `

  return decision.shouldRedirect
}

export function getSecretRedirectFallbackUrl(): string {
  return process.env.SECRET_REDIRECT_FALLBACK_URL?.trim() || 'https://app.hawktrk.com/sl?id=6a2050db46d3cf0d62f32aa4&pid=2&sub2=u811439&sub6=s2smartLink&sub5=winner'
}
