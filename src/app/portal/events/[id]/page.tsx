import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createEventIcs } from '@/lib/calendar/ical'

interface Props {
  params: { id: string }
}

export default async function EventPortalPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { group: true },
  })

  if (!event) notFound()

  const attendee = userId
    ? await prisma.attendee.findFirst({
        where: { eventId: event.id, user: { id: userId } },
      })
    : null

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const icsUrl = `${baseUrl}/api/calendar/${event.group.slug}/feed`

  return (
    <div>
      <Link href="/portal/calendar" className="text-gray-500 hover:text-gray-700 text-sm">← Events</Link>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="text-sm text-blue-600 font-medium mb-2">{event.group.name}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Date</dt>
                <dd className="text-gray-900">{format(event.startDatetime, 'EEEE d MMMM yyyy')}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Time</dt>
                <dd className="text-gray-900">{format(event.startDatetime, 'HH:mm')} – {format(event.endDatetime, 'HH:mm')}</dd>
              </div>
              {event.location && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase">Location</dt>
                  <dd className="text-gray-900">{event.location}</dd>
                </div>
              )}
              {event.onlineLink && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase">Online Link</dt>
                  <dd><a href={event.onlineLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{event.onlineLink}</a></dd>
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About this event</h2>
              <p className="text-gray-600">{event.description}</p>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            {event.eventbriteUrl && (
              <a
                href={event.eventbriteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600"
              >
                Register on Eventbrite
              </a>
            )}
            <a
              href={icsUrl}
              className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Add to Calendar (.ics)
            </a>
          </div>

          {attendee && (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700">
              You are registered for this event.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
