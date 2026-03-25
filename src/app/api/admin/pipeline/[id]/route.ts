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
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: params.id },
      include: {
        deals: {
          include: { activities: { orderBy: { createdAt: 'desc' } }, assignedUser: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })
    if (!pipeline) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(pipeline)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const pipeline = await prisma.pipeline.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.stages && { stages: data.stages }),
        ...(data.outcomeWin && { outcomeWin: data.outcomeWin }),
        ...(data.outcomeLoss && { outcomeLoss: data.outcomeLoss }),
      },
    })
    return NextResponse.json(pipeline)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.pipeline.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 })
  }
}
