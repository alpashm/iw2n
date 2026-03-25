import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function PortalDashboard() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { status: 'active' },
        include: { group: true },
      },
    },
  })

  if (!user) return <div className="text-center py-12 text-red-500">User not found</div>

  const groupIds = user.memberships.map((m: { groupId: string }) => m.groupId)

  const upcomingEvents = await prisma.event.findMany({
    where: {
      groupId: { in: groupIds },
      status: 'published',
      startDatetime: { gte: new Date() },
    },
    include: { group: true },
    orderBy: { startDatetime: 'asc' },
    take: 10,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user.firstName}!</h1>
      <p className="text-gray-500 mb-8">Your upcoming events across all your groups</p>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No upcoming events in your groups</div>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.map((event: { id: string; title: string; startDatetime: Date; location: string | null; type: string; group: { name: string } }) => (
            <Link key={event.id} href={`/portal/events/${event.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">{event.group.name}</div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {format(event.startDatetime, 'EEEE d MMMM yyyy')} at {format(event.startDatetime, 'HH:mm')}
                  </div>
                  {event.location && <div className="text-sm text-gray-400 mt-0.5">{event.location}</div>}
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${event.type === 'in-person' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {event.type}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {user.memberships.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Groups</h2>
          <div className="grid grid-cols-2 gap-4">
            {user.memberships.map((m: { id: string; group: { slug: string; name: string; type: string } }) => (
              <Link key={m.id} href={`/portal/groups/${m.group.slug}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900">{m.group.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{m.group.type}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
