import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMemberFeedIcs } from '@/lib/calendar/ical'

export async function GET(_req: NextRequest, { params }: { params: { icalToken: string } }) {
  try {
    // Find calendar feed by token
    const feed = await prisma.calendarFeed.findUnique({
      where: { icalToken: params.icalToken },
      include: { group: { include: { memberships: { include: { user: true } } } } },
    })

    if (!feed) {
      return new NextResponse('Invalid token', { status: 401 })
    }

    // Find the user who owns this token (via their group membership)
    const memberships = await prisma.groupMembership.findMany({
      where: { groupId: feed.groupId, status: 'active' },
      include: { user: true },
    })

    // For now, return all group events - personalized token should map to a specific user
    // The token is per CalendarFeed (per group), so serve all group events
    const events = await prisma.event.findMany({
      where: {
        groupId: feed.groupId,
        status: 'published',
        startDatetime: { gte: new Date() },
      },
      include: { attendees: true },
      orderBy: { startDatetime: 'asc' },
    })

    // Get all attendee emails for registration check
    const attendeeEmails = new Set(
      events.flatMap((e: { attendees: Array<{ email: string }> }) => e.attendees.map((a) => a.email.toLowerCase()))
    )

    const memberEmails = memberships.map((m: { user: { email: string } }) => m.user.email.toLowerCase())

    const memberName = feed.group.name
    const icsContent = createMemberFeedIcs(
      memberName,
      events.map((e: { id: string; title: string; description: string | null; startDatetime: Date; endDatetime: Date; timezone: string; location: string | null; onlineLink: string | null; eventbriteUrl: string | null; attendees: Array<{ email: string }> }) => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        startDatetime: e.startDatetime,
        endDatetime: e.endDatetime,
        timezone: e.timezone,
        location: e.location || undefined,
        onlineLink: e.onlineLink || undefined,
        eventbriteUrl: e.eventbriteUrl || undefined,
        groupName: feed.group.name,
        registered: e.attendees.some((a) =>
          memberEmails.some((me: string) => me === a.email.toLowerCase())
        ),
      }))
    )

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${feed.group.slug}-personal.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch {
    return new NextResponse('Internal error', { status: 500 })
  }
}
