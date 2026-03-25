import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getXeroService } from '@/lib/integrations/xero'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        memberships: { include: { group: true } },
        memberPackages: { include: { package: true } },
        xeroLink: { include: { xeroContact: true } },
      },
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Get Keap cache data if linked
    let keapData = null
    if (user.keapContactId) {
      keapData = await prisma.keapContactCache.findUnique({
        where: { keapId: user.keapContactId },
      })
    }

    // Get Xero invoices if linked
    let xeroInvoices = null
    if (user.xeroLink?.xeroContactId) {
      try {
        const xero = await getXeroService()
        if (xero) {
          const invoicesData = await xero.getInvoices(user.xeroLink.xeroContactId)
          xeroInvoices = invoicesData.Invoices || []
        }
      } catch {
        // Xero not configured or error - non-fatal
      }
    }

    return NextResponse.json({ ...user, keapData, xeroInvoices })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.keapContactId !== undefined && { keapContactId: data.keapContactId }),
        ...(data.xeroContactId !== undefined && { xeroContactId: data.xeroContactId }),
      },
    })
    return NextResponse.json(user)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}
