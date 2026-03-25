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
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        group: true,
        attendees: { orderBy: { registeredAt: 'desc' } },
      },
    })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(event)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDatetime && { startDatetime: new Date(data.startDatetime) }),
        ...(data.endDatetime && { endDatetime: new Date(data.endDatetime) }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.onlineLink !== undefined && { onlineLink: data.onlineLink }),
        ...(data.type && { type: data.type }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.status && { status: data.status }),
        ...(data.eventbriteEventId !== undefined && { eventbriteEventId: data.eventbriteEventId }),
        ...(data.eventbriteUrl !== undefined && { eventbriteUrl: data.eventbriteUrl }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      },
    })
    return NextResponse.json(event)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.event.update({
      where: { id: params.id },
      data: { status: 'cancelled' },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
  }
}
