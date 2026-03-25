import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { emsUserId, xeroContactId, action } = await request.json()

    if (!emsUserId || !action) {
      return NextResponse.json({ error: 'emsUserId and action are required' }, { status: 400 })
    }

    if (action === 'confirm') {
      if (!xeroContactId) {
        return NextResponse.json({ error: 'xeroContactId required for confirm' }, { status: 400 })
      }

      const link = await prisma.xeroLink.upsert({
        where: { emsUserId },
        update: {
          xeroContactId,
          matchStatus: 'confirmed',
          matchedBy: 'manual',
          confirmedAt: new Date(),
        },
        create: {
          emsUserId,
          xeroContactId,
          matchStatus: 'confirmed',
          matchedBy: 'manual',
          confirmedAt: new Date(),
        },
      })

      // Also update user's xeroContactId
      await prisma.user.update({
        where: { id: emsUserId },
        data: { xeroContactId },
      })

      return NextResponse.json(link)
    } else if (action === 'reject') {
      await prisma.xeroLink.upsert({
        where: { emsUserId },
        update: { matchStatus: 'not-in-xero', confirmedAt: null },
        create: {
          emsUserId,
          xeroContactId: xeroContactId || 'rejected',
          matchStatus: 'not-in-xero',
        },
      })
      return NextResponse.json({ success: true })
    } else if (action === 'unlink') {
      await prisma.xeroLink.delete({ where: { emsUserId } })
      await prisma.user.update({
        where: { id: emsUserId },
        data: { xeroContactId: null },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Link failed' },
      { status: 500 }
    )
  }
}
