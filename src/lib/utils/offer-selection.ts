type Offer = {
  id: string
  priority: number
  rotationMode: string
  offerUrl: string
  country: string
  isGlobal: boolean
  isContentLocker: boolean
  isActive: boolean
  createdAt: Date
  groupName: string | null
  usaSecretRedirectEnabled: boolean
  usaSecretRedirectPercentage?: number
}

const normalizeGroupName = (value?: string | null) => value?.trim() ?? ''

const selectRotatingOffer = (offers: Offer[]): Offer | null => {
  if (!offers.length) return null
  if (offers.length === 1) return offers[0]

  const randomPool = offers.filter((offer) => offer.rotationMode === 'RANDOM')
  if (randomPool.length > 0) {
    return randomPool[Math.floor(Math.random() * randomPool.length)]
  }

  return [...offers].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.createdAt.getTime() - b.createdAt.getTime()
  })[0]
}

const selectGroupOfferForUser = async (
  tx: { offerVault: { findMany: (args: { where: Record<string, unknown>; orderBy?: Array<{ priority: 'desc' } | { createdAt: 'asc' }> }) => Promise<Offer[]> } },
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
  })

  let offer = selectRotatingOffer(regionalGroupCandidates)

  if (!offer) {
    const globalGroupCandidates = await tx.offerVault.findMany({
      where: {
        userId,
        groupName,
        isActive: true,
        OR: [
          { isGlobal: true },
          { isContentLocker: true },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })
    offer = selectRotatingOffer(globalGroupCandidates)
  }

  return offer
}

export const selectOffer = async (
  tx: { offerVault: { findMany: (args: { where: Record<string, unknown>; orderBy?: Array<{ priority: 'desc' } | { createdAt: 'asc' }> }) => Promise<Offer[]> } },
  userIds: string[],
  country: string,
  linkGroupName: string | null
): Promise<Offer | null> => {
  if (userIds.length === 0) return null

  for (const userId of userIds) {
    if (linkGroupName) {
      const countryGroupOffers = await tx.offerVault.findMany({
        where: {
          userId,
          groupName: linkGroupName,
          country,
          isActive: true,
          isGlobal: false,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      })

      const countryOffer = selectRotatingOffer(countryGroupOffers)
      if (countryOffer) return countryOffer
    }

    const countryOffers = await tx.offerVault.findMany({
      where: {
        userId,
        country,
        isActive: true,
        isGlobal: false,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    const namedGroupOffers = countryOffers.filter(
      (offer) => normalizeGroupName(offer.groupName) && (!linkGroupName || normalizeGroupName(offer.groupName) === linkGroupName),
    )
    const directOffers = countryOffers.filter((offer) => !normalizeGroupName(offer.groupName))

    const matchedCountryOffer = selectRotatingOffer(namedGroupOffers.length ? namedGroupOffers : directOffers)
    if (matchedCountryOffer) return matchedCountryOffer

    if (linkGroupName) {
      const globalGroupOffers = await tx.offerVault.findMany({
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
      })

      const globalOffer = selectRotatingOffer(globalGroupOffers)
      if (globalOffer) return globalOffer
    }

    const globalOffers = await tx.offerVault.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { isGlobal: true },
          { isContentLocker: true },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    const globalOffer = selectRotatingOffer(globalOffers)
    if (globalOffer) return globalOffer
  }

  return null
}
