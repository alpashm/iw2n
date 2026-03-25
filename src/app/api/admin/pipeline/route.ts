import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pipelines = await prisma.pipeline.findMany({
      include: { _count: { select: { deals: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(pipelines)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, stages, outcomeWin, outcomeLoss } = data

    if (!name || !stages) {
      return NextResponse.json({ error: 'name and stages are required' }, { status: 400 })
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        stages,
        outcomeWin: outcomeWin || 'Won',
        outcomeLoss: outcomeLoss || 'Lost',
      },
    })
    return NextResponse.json(pipeline, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 })
  }
}
