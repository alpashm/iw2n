import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export default async function GroupPortalPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const group = await prisma.group.findUnique({
    where: { slug: params.slug },
    include: { calendarFeed: true },
  })

  if (!group) notFound()

  const events = await prisma.event.findMany({
    where: { groupId: group.id, status: 'published', startDatetime: { gte: new Date() } },
    orderBy: { startDatetime: 'asc' },
    take: 20,
  })

  const membership = await prisma.groupMembership.findFirst({
    where: { userId, groupId: group.id },
  })

  const isMember = !!membership && membership.status === 'active'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const icalUrl = `${baseUrl}/api/calendar/${group.slug}/feed`

  return (
    <div>
      <Link href="/portal/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
      <div className="flex justify-between items-start mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-gray-500 mt-1">{group.description}</p>}
        </div>
        {isMember && (
          <div className="text-right">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Member</span>
            <div className="mt-2 text-xs text-gray-500">
              <div className="font-medium mb-1">iCal Subscribe URL:</div>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all block">{icalUrl}</code>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No upcoming events</div>
      ) : (
        <div className="space-y-3">
          {events.map((event: { id: string; title: string; startDatetime: Date; location: string | null }) => (
            <Link key={event.id} href={`/portal/events/${event.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{event.title}</h3>
              <div className="text-sm text-gray-500 mt-1">
                {format(event.startDatetime, 'EEEE d MMMM yyyy')} at {format(event.startDatetime, 'HH:mm')}
              </div>
              {event.location && <div className="text-sm text-gray-400">{event.location}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
