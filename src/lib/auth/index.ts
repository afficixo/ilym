import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { createUserSafe } from '@/lib/db/user'
import { OWNER_USERNAME, OWNER_PASSWORD } from '@/lib/constants'
import type { UserRole } from '@/types'

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for security')
  }
  return secret
})()
export const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || String(60 * 60 * 24 * 30), 10)

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REJECTED'
export function normalizeEffectiveUserRole(user: { role?: UserRole; username?: string } | null | undefined): UserRole | undefined {
  if (!user) return undefined
  if (user.role === 'OWNER') return 'OWNER'
  if (typeof user.username === 'string' && OWNER_USERNAME && user.username === OWNER_USERNAME) {
    return 'OWNER'
  }
  return user.role
}

export function isAdmin(user: { role?: UserRole; username?: string } | null | undefined): boolean {
  const normalizedRole = normalizeEffectiveUserRole(user)
  return Boolean(normalizedRole === 'ADMIN')
}

export function isAccountActive(user: { status?: string | null } | null | undefined): boolean {
  return Boolean(user && (user.status === undefined || user.status === null || user.status === 'ACTIVE'))
}

export function isManager(user: { role?: UserRole } | null | undefined): boolean {
  return Boolean(user && user.role === 'MANAGER')
}

export function isOwner(user: { role?: UserRole; username?: string } | null | undefined): boolean {
  return normalizeEffectiveUserRole(user) === 'OWNER'
}

export function isAdminOrOwner(user: { role?: UserRole; username?: string } | null | undefined): boolean {
  return isAdmin(user) || isOwner(user)
}

export function getEffectiveOwnerBackedUserId(
  user: { id: string; role?: UserRole; username?: string } | null | undefined,
  ownerUserId: string | null | undefined
): string {
  if (!user) return ''
  if (isOwner(user)) return ownerUserId || user.id
  if (isManager(user)) return ownerUserId || user.id
  return user.id
}

export function normalizeUserIdList(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()

  for (const id of ids) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
  }

  return [...seen]
}

export async function resolveUserIdForRecord(
  user: { id: string; role?: UserRole; username?: string } | null | undefined,
  ownerUserId: string | null | undefined
): Promise<string> {
  if (!user) return ''

  if (typeof user.id === 'string' && user.id.startsWith('local-')) {
    // Reject local-* tokens in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Demo accounts are not supported in production')
    }

    const username = user.id.replace(/^local-/, '')
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (existing?.id) {
      return existing.id
    }

    if (ownerUserId) {
      return ownerUserId
    }

    const securePassword = randomBytes(32).toString('hex')
    const hashed = await bcrypt.hash(securePassword, 10)
    const created = await createUserSafe({
      username,
      email: `${username}@example.com`,
      password: hashed,
      role: user.role === 'MANAGER' ? 'MANAGER' : 'ADMIN',
      status: 'ACTIVE',
    } as any)

    return created.id
  }

  return getEffectiveOwnerBackedUserId(user, ownerUserId)
}

async function createOwnerUser(): Promise<string | null> {
  if (!OWNER_USERNAME || !OWNER_PASSWORD) {
    return null
  }

  const hashed = await bcrypt.hash(OWNER_PASSWORD, 10)
  try {
    const owner = await createUserSafe({
      username: OWNER_USERNAME,
      email: `${OWNER_USERNAME}@example.com`,
      password: hashed,
      role: 'OWNER',
      status: 'ACTIVE',
    } as any)
    return owner.id
  } catch (err) {
    // Some deployments may have an older DB enum that doesn't include
    // the `OWNER` value. Fall back to creating the account as `ADMIN`
    // to avoid blocking startup. Log the original error for diagnostics.
    console.error('Failed to create owner user with role OWNER, retrying as ADMIN:', err)
    try {
      const ownerAsAdmin = await createUserSafe({
        username: OWNER_USERNAME,
        email: `${OWNER_USERNAME}@example.com`,
        password: hashed,
        role: 'ADMIN',
        status: 'ACTIVE',
      } as any)
      return ownerAsAdmin.id
    } catch (err2) {
      console.error('Failed to create owner user as ADMIN too:', err2)
      return null
    }
  }
}

export async function getOwnerUserId(): Promise<string | null> {
  if (!OWNER_USERNAME) {
    return null
  }

  const owner = await prisma.user.findUnique({
    where: { username: OWNER_USERNAME },
    select: { id: true, role: true },
  })

  if (owner?.id) {
    // If the configured owner account exists, return its id. Some databases
    // may not support the OWNER enum value, so do not attempt to normalize
    // the role at runtime. The app already treats the configured owner
    // username as owner via `isOwner()` fallback.
    return owner.id
  }

  return await createOwnerUser()
}

export async function getEffectiveOfferUserId(userId: string): Promise<string> {
  const ownerUserId = await getOwnerUserId()
  if (!ownerUserId) {
    return userId
  }

  if (userId === ownerUserId) {
    return ownerUserId
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === 'MANAGER') {
    return ownerUserId
  }

  return userId
}

export function buildOfferSelectionUserIds(
  userId: string,
  userRole: UserRole | undefined,
  ownerUserId: string | null | undefined
): string[] {
  if (!ownerUserId) {
    return [userId]
  }

  if (userId === ownerUserId) {
    return [ownerUserId]
  }

  if (userRole === 'MANAGER' || userId.startsWith('local-')) {
    return normalizeUserIdList([ownerUserId, userId])
  }

  return [userId]
}

export async function getOfferSelectionUserIds(userId: string): Promise<string[]> {
  const ownerUserId = await getOwnerUserId()
  
  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  if (!ownerUserId) {
    return [userId]
  }

  return buildOfferSelectionUserIds(userId, user.role, ownerUserId)
}

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: username, mode: 'insensitive' } },
        { email: { equals: username, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      password: true,
      role: true,
      status: true,
    },
  })

  if (!user) return null

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return user
}

export function generateToken(userId: string, purpose?: string, expiresIn: number | undefined = JWT_EXPIRY): string {
  return jwt.sign(
    { userId, purpose, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn, algorithm: 'HS256' }
  )
}

export function verifyToken(token: string): { userId: string; purpose?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string }
  } catch {
    return null
  }
}

type AuthUser = {
  id: string
  username: string
  role: UserRole
  email?: string
  status?: AccountStatus | null
  bkashNumber?: string | null
  clickRate?: number | null
  commissionRate?: number | null
  canUseSecretRedirect?: boolean
  payoutMethod?: string | null
  payoutAccount?: string | null
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const decoded = verifyToken(token)
  if (!decoded) return null

  // Support temporary in-memory tokens with userId prefixed by 'local-'. If
  // the corresponding user already exists in the database, return the DB
  // user so writes use a proper FK-backed id.
  if (decoded.userId && decoded.userId.startsWith('local-')) {
    const username = decoded.userId.replace(/^local-/, '')
    let existing: { id: string; username: string; email: string | null; role: UserRole; status: AccountStatus } | null = null
    try {
      existing = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
        },
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error
    }

    if (existing) {
      if (existing.status === 'DISABLED') return null
      return existing as AuthUser
    }

    const role = username === OWNER_USERNAME ? 'OWNER' : 'ADMIN'
    return { id: decoded.userId, username, role }
  }

  try {
    const user = (await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bkashNumber: true,
        clickRate: true,
        commissionRate: true,
        canUseSecretRedirect: true,
        payoutMethod: true,
        payoutAccount: true,
        status: true,
      },
    })) as AuthUser | null
    return user?.status === 'DISABLED' ? null : user
  } catch (error: any) {
    if (error?.code !== 'P2022' || !String(error?.meta?.column || '').includes('commissionRate')) {
      throw error
    }

    const user = (await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bkashNumber: true,
        clickRate: true,
        payoutMethod: true,
        payoutAccount: true,
        status: true,
      },
    })) as AuthUser | null
    return user?.status === 'DISABLED' ? null : user
  }
}

export function getTokenFromCookie(cookieHeader: string): string | null {
  if (!cookieHeader) return null

  const cookiePairs = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)

  for (const cookie of cookiePairs) {
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex === -1) continue

    const name = cookie.slice(0, separatorIndex).trim()
    const value = cookie.slice(separatorIndex + 1).trim()

    if (name === 'auth-token') {
      return decodeURIComponent(value)
    }
  }

  return null
}

export function generateGooglePasswordResetToken(userId: string): string {
  return generateToken(userId, 'google-password-reset', 600)
}

export function verifyGooglePasswordResetToken(token: string): { userId: string } | null {
  const decoded = verifyToken(token)
  if (!decoded || decoded.purpose !== 'google-password-reset') return null
  return { userId: decoded.userId }
}