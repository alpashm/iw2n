import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pipelineId = searchParams.get('pipelineId')
  const status = searchParams.get('status')

  try {
    const deals = await prisma.deal.findMany({
      where: {
        ...(pipelineId && { pipelineId }),
        ...(status && { status }),
      },
      include: {
        assignedUser: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(deals)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { pipelineId, title, stage, value, contactId, assignedTo } = data

    if (!pipelineId || !title || !stage) {
      return NextResponse.json({ error: 'pipelineId, title, stage are required' }, { status: 400 })
    }

    const deal = await prisma.deal.create({
      data: {
        pipelineId,
        title,
        stage,
        value: value || null,
        contactId: contactId || null,
        assignedTo: assignedTo || null,
        status: 'open',
      },
    })

    // Log initial stage
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: 'stage-change',
        note: `Deal created in stage: ${stage}`,
        createdBy: (session.user as any)?.id,
      },
    })

    return NextResponse.json(deal, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
