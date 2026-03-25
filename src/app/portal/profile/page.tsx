import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateUnsubscribeToken, buildUnsubscribeLink } from '@/lib/email/tokens'
import { format } from 'date-fns'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { group: { include: { calendarFeed: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!user) return <div className="text-center py-12 text-red-500">User not found</div>

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Name</dt>
              <dd className="text-gray-900">{user.firstName} {user.lastName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Email</dt>
              <dd className="text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Member Since</dt>
              <dd className="text-gray-900">{format(user.createdAt, 'MMMM yyyy')}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Subscriptions</h2>
          {user.memberships.length === 0 ? (
            <p className="text-gray-400 text-sm">No group memberships</p>
          ) : (
            <div className="space-y-3">
              {user.memberships.map((m: { id: string; groupId: string; joinedAt: Date; unsubscribedAt: Date | null; group: { name: string; slug: string; calendarFeed: { icalToken: string } | null } }) => {
                const unsubToken = generateUnsubscribeToken(userId, m.groupId)
                const unsubLink = buildUnsubscribeLink(baseUrl, m.groupId, userId, unsubToken)
                const icalUrl = m.group.calendarFeed
                  ? `${baseUrl}/api/calendar/member/${m.group.calendarFeed.icalToken}/feed`
                  : `${baseUrl}/api/calendar/${m.group.slug}/feed`

                return (
                  <div key={m.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{m.group.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.unsubscribedAt
                            ? `Unsubscribed ${format(new Date(m.unsubscribedAt), 'dd MMM yyyy')}`
                            : `Joined ${format(m.joinedAt, 'dd MMM yyyy')}`
                          }
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div>
                          <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-500 break-all">{icalUrl}</code>
                        </div>
                        {!m.unsubscribedAt && (
                          <a href={unsubLink} className="text-xs text-red-500 hover:text-red-700">Unsubscribe from emails</a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
