export const SLUG_PREFIX_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ'
export const SLUG_CODE_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789'

function randomFromAlphabet(alphabet: string) {
  return alphabet[Math.floor(Math.random() * alphabet.length)]
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items]

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]]
  }

  return cloned
}

function randomDistinctLetters(count: number) {
  const letters = shuffleArray([...SLUG_PREFIX_ALPHABET])
  return letters.slice(0, count).join('')
}

export function generateFixedPrefix() {
  return randomDistinctLetters(2)
}

export function generateRandomSlugCode(length = 5) {
  const letters = shuffleArray([...SLUG_PREFIX_ALPHABET])
  const digits = shuffleArray([...'23456789'])
  const pattern = shuffleArray([
    'letter',
    'letter',
    'letter',
    'digit',
    'digit',
  ])

  return pattern
    .map((type) => {
      if (type === 'letter') {
        return letters.shift() || randomFromAlphabet(SLUG_PREFIX_ALPHABET)
      }

      return digits.shift() || randomFromAlphabet('23456789')
    })
    .join('')
    .slice(0, length)
}

export function buildPublisherSlug(prefix: string, codeLength = 5) {
  return `${prefix}${generateRandomSlugCode(codeLength)}`
}

export async function ensureUserSlugPrefix(prismaClient: any, userId: string) {
  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { slugPrefix: true },
  })

  if (existingUser?.slugPrefix) {
    return existingUser.slugPrefix
  }

  const existingUsers = await prismaClient.user.findMany({
    select: { slugPrefix: true },
  })

  const usedPrefixes = new Set(
    existingUsers
      .map((user: { slugPrefix?: string | null }) => user.slugPrefix)
      .filter((slugPrefix: string | null | undefined): slugPrefix is string => Boolean(slugPrefix))
  )

  let prefix = generateFixedPrefix()
  while (usedPrefixes.has(prefix)) {
    prefix = generateFixedPrefix()
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: { slugPrefix: prefix },
  })

  return prefix
}
