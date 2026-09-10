import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { generateFixedPrefix } from '@/lib/utils/slug'

export async function createUserSafe(initialData: Prisma.UserCreateInput) {
  let data: Record<string, any> = { ...initialData } as Record<string, any>
  // Cache of existing columns for the `users` table to avoid repeated information_schema queries.
  // This prevents Prisma from generating SQL that references missing columns.
  const COLUMN_CACHE_TTL = 60 * 1000 // 60s
  let cachedColumns: { set: Set<string>; expires: number } | undefined

  async function getExistingUserColumns(): Promise<Set<string>> {
    if (cachedColumns && Date.now() < cachedColumns.expires) return cachedColumns.set
    try {
      const rows: Array<{ column_name: string }> = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = current_schema()
      `
      const set = new Set(rows.map((r) => String(r.column_name)))
      cachedColumns = { set, expires: Date.now() + COLUMN_CACHE_TTL }
      return set
    } catch (e) {
      // On any error, return an empty set so we don't accidentally drop fields.
      return new Set()
    }
  }

  while (true) {
    try {
      if (!data.slugPrefix) {
        const users = await prisma.user.findMany({
          select: { slugPrefix: true },
        })

        const usedPrefixes = new Set(
          users
            .map((user) => user.slugPrefix)
            .filter((slugPrefix): slugPrefix is string => Boolean(slugPrefix))
        )

        let prefix = generateFixedPrefix()
        while (usedPrefixes.has(prefix)) {
          prefix = generateFixedPrefix()
        }

        data.slugPrefix = prefix
      }

      // Ensure we only include columns that actually exist in the DB to avoid P2022 errors.
      const existing = await getExistingUserColumns()
      const filtered = Object.fromEntries(
        Object.entries(data).filter(([k]) => existing.size === 0 ? true : existing.has(k))
      ) as Prisma.UserCreateInput

      return await prisma.user.create({ data: filtered })
    } catch (err: any) {
      const code = err?.code

      if (code === 'P2022') {
        // Try to determine which field(s) caused the P2022 and remove them from `data`.
        let removed = false

        // 1) Prefer explicit meta.column when provided (may be 'users.fullName' or 'fullName')
        const metaColumn = String(err?.meta?.column || '')
        if (metaColumn) {
          const missingField = metaColumn.replace(/^users\./, '')
          if (missingField in data) {
            delete data[missingField]
            removed = true
          }
        }

        // 2) Otherwise, inspect the error message for any keys that match properties on `data`.
        if (!removed) {
          const msg = String(err?.message || '').toLowerCase()
          for (const key of Object.keys(data)) {
            if (!key) continue
            const lower = String(key).toLowerCase()
            if (msg.includes(lower)) {
              delete data[key]
              removed = true
              break
            }
          }
        }

        // 3) Fallback: remove common optional user fields if present.
        if (!removed) {
          const common = ['fullName', 'contractNumber', 'telegramUsername', 'bkashNumber', 'source', 'status']
          for (const k of common) {
            if (k in data) {
              delete data[k]
              removed = true
              break
            }
          }
        }

        if (removed) {
          // Retry the create with the offending field removed.
          continue
        }
      }

      throw err
    }
  }
}
