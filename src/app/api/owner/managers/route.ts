import { NextResponse } from 'next/server'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getCorsHeaders } from '@/config/cors'

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || null
  const cookieHeader = request.headers.get('cookie') || ''
  const token = getTokenFromCookie(cookieHeader)

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: getCorsHeaders(origin) }
    )
  }

  const user = await getUserFromToken(token)
  if (!user || !isOwner(user)) {
    return NextResponse.json(
      { error: 'Owner access required' },
      { status: 403, headers: getCorsHeaders(origin) }
    )
  }

  try {
    const selectFields: Record<string, any> = {
      id: true,
      username: true,
      email: true,
      fullName: true,
      address: true,
      source: true,
      contractNumber: true,
      telegramUsername: true,
      bkashNumber: true,
      payoutMethod: true,
      payoutAccount: true,
      clickRate: true,
      commissionRate: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
      managerPayouts: {
        orderBy: { createdAt: 'desc' },
        select: { payoutNumber: true, totalEarning: true, payoutMethod: true, paymentReference: true, isPaid: true, paidAt: true, createdAt: true },
      },
    }

    let managers = null
    let selectConfig: Record<string, any> = { ...selectFields }
    selectConfig = {
      ...selectConfig,
      linkAccounts: {
        select: {
          id: true,
          accountName: true,
          payoutMethod: true,
          payoutAccount: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            select: {
              invoiceNumber: true,
              totalEarning: true,
              isPaid: true,
              payoutMethod: true,
              payoutAccount: true,
              managerPayouts: {
                select: { payoutId: true },
              },
              createdAt: true,
              paidAt: true,
            },
          },
        },
      },
    }
    while (true) {
      try {
        managers = await prisma.user.findMany({
          where: { role: 'MANAGER' },
          orderBy: { createdAt: 'desc' },
          select: selectConfig,
        })
        break
      } catch (innerError: any) {
        const missingColumnRaw = String(innerError?.meta?.column || '')
        if (innerError?.code === 'P2021') {
          const missingTable = String(innerError?.meta?.table || '')
          if (missingTable.includes('manager_payout') || missingTable.includes('ManagerPayout')) {
            delete selectConfig.managerPayouts
            delete selectConfig.linkAccounts.select.invoices.select.managerPayouts
            continue
          }
        }

        if (innerError?.code === 'P2022') {
          let missingField = ''
          if (missingColumnRaw) {
            missingField = missingColumnRaw.replace(/^users\./, '')
          } else {
            const msg = String(innerError?.message || '')
            const m = msg.match(/users?\.?(\w+)/i) || msg.match(/column\s+'?(\w+)'?/i)
            if (m) missingField = m[1]
          }

          if (missingField && missingField in selectConfig) {
            delete selectConfig[missingField]
            continue
          }
        }
        throw innerError
      }
    }

    const normalizedManagers = (managers || []).map((manager: any) => ({
      ...manager,
      managerPayouts: manager.managerPayouts || [],
      linkAccounts: (manager.linkAccounts || []).map((linkAccount: any) => ({
        ...linkAccount,
        invoices: (linkAccount.invoices || []).map((invoice: any) => ({
          ...invoice,
          managerPayouts: invoice.managerPayouts || [],
        })),
      })),
    }))

    return NextResponse.json({ managers: normalizedManagers }, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Owner managers GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load manager accounts.' },
      { status: 500, headers: getCorsHeaders(origin) }
    )
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}
