import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        assignedUser: true,
        activities: { orderBy: { createdAt: 'desc' } },
        pipeline: true,
      },
    })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(deal)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const userId = (session.user as any)?.id

    // Fetch current deal to check stage change
    const currentDeal = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!currentDeal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.stage !== undefined && { stage: data.stage }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.outcome !== undefined && { outcome: data.outcome }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.contactId !== undefined && { contactId: data.contactId }),
      },
    })

    // Log stage changes
    if (data.stage && data.stage !== currentDeal.stage) {
      await prisma.dealActivity.create({
        data: {
          dealId: params.id,
          type: 'stage-change',
          note: `Stage changed from "${currentDeal.stage}" to "${data.stage}"`,
          createdBy: userId,
        },
      })
    }

    // Log notes
    if (data.note) {
      await prisma.dealActivity.create({
        data: {
          dealId: params.id,
          type: 'note',
          note: data.note,
          createdBy: userId,
        },
      })
    }

    return NextResponse.json(deal)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.deal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
