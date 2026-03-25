import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ical from 'ical-generator'

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'published',
        startDatetime: { gte: new Date() },
        group: { calendarVisibility: 'public' },
      },
      include: { group: true },
      orderBy: { startDatetime: 'asc' },
    })

    const cal = ical({ name: 'IWant2Network - All Events' })

    for (const event of events) {
      cal.createEvent({
        id: event.id,
        summary: `[${event.group.name}] ${event.title}`,
        description: event.description || '',
        start: event.startDatetime,
        end: event.endDatetime,
        timezone: event.timezone,
        location: event.location || event.onlineLink || undefined,
        url: event.eventbriteUrl || undefined,
      })
    }

    return new NextResponse(cal.toString(), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="iw2n-all-events.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch {
    return new NextResponse('Internal error', { status: 500 })
  }
}
