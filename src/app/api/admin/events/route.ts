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
  const groupId = searchParams.get('groupId')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    const events = await prisma.event.findMany({
      where: {
        ...(groupId && { groupId }),
        ...(status && { status }),
        ...(from || to
          ? {
              startDatetime: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      orderBy: { startDatetime: 'desc' },
      include: {
        group: { select: { id: true, name: true, slug: true } },
        _count: { select: { attendees: true } },
      },
    })
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      groupId,
      title,
      description,
      startDatetime,
      endDatetime,
      timezone,
      location,
      onlineLink,
      type,
      capacity,
      eventbriteEventId,
      eventbriteUrl,
    } = data

    if (!groupId || !title || !startDatetime || !endDatetime || !type) {
      return NextResponse.json(
        { error: 'groupId, title, startDatetime, endDatetime, type are required' },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        groupId,
        title,
        description: description || null,
        startDatetime: new Date(startDatetime),
        endDatetime: new Date(endDatetime),
        timezone: timezone || 'Europe/London',
        location: location || null,
        onlineLink: onlineLink || null,
        type,
        capacity: capacity || null,
        eventbriteEventId: eventbriteEventId || null,
        eventbriteUrl: eventbriteUrl || null,
        status: 'draft',
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
