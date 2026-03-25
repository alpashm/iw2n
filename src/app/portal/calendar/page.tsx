import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function PublicCalendarPage() {
  const events = await prisma.event.findMany({
    where: {
      status: 'published',
      startDatetime: { gte: new Date() },
      group: { calendarVisibility: 'public' },
    },
    include: { group: true },
    orderBy: { startDatetime: 'asc' },
    take: 50,
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const publicFeedUrl = `${baseUrl}/api/calendar/public/feed`

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Calendar</h1>
          <p className="text-gray-500 mt-1">All upcoming public networking events</p>
        </div>
        <a
          href={publicFeedUrl}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Subscribe iCal
        </a>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No public events at this time</div>
      ) : (
        <div className="space-y-3">
          {events.map((event: { id: string; title: string; startDatetime: Date; location: string | null; type: string; group: { name: string } }) => (
            <Link key={event.id} href={`/portal/events/${event.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">{event.group.name}</div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {format(event.startDatetime, 'EEEE d MMMM yyyy')} at {format(event.startDatetime, 'HH:mm')}
                  </div>
                  {event.location && <div className="text-sm text-gray-400">{event.location}</div>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${event.type === 'in-person' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {event.type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
