import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createGroupFeedIcs } from '@/lib/calendar/ical'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const group = await prisma.group.findUnique({ where: { slug: params.slug } })
    if (!group) {
      return new NextResponse('Group not found', { status: 404 })
    }

    const events = await prisma.event.findMany({
      where: {
        groupId: group.id,
        status: 'published',
        startDatetime: { gte: new Date() },
      },
      orderBy: { startDatetime: 'asc' },
    })

    const icsContent = createGroupFeedIcs(
      group.name,
      events.map((e: { id: string; title: string; description: string | null; startDatetime: Date; endDatetime: Date; timezone: string; location: string | null; onlineLink: string | null; eventbriteUrl: string | null }) => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        startDatetime: e.startDatetime,
        endDatetime: e.endDatetime,
        timezone: e.timezone,
        location: e.location || undefined,
        onlineLink: e.onlineLink || undefined,
        eventbriteUrl: e.eventbriteUrl || undefined,
        groupName: group.name,
      }))
    )

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${group.slug}-events.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    return new NextResponse('Internal error', { status: 500 })
  }
}
