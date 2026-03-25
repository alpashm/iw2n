import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  const now = new Date()
  const tomorrow = addDays(now, 1)
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  const [
    totalMembers,
    totalGroups,
    totalEvents,
    openDeals,
    unreadTickets,
    recentReferrals,
    tomorrowEvents,
    recentSyncLogs,
    integrations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.group.count({ where: { status: 'active' } }),
    prisma.event.count({ where: { status: 'published' } }),
    prisma.deal.count({ where: { status: 'open' } }),
    prisma.ticket.count({ where: { status: { in: ['new', 'open', 'ai-draft-ready'] } } }),
    prisma.referral.findMany({
      include: { personA: true, personB: true },
      orderBy: { sentAt: 'desc' },
      take: 5,
    }),
    prisma.event.findMany({
      where: {
        type: 'in-person',
        status: 'published',
        startDatetime: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      include: { group: true },
    }),
    prisma.syncLog.findMany({ orderBy: { syncedAt: 'desc' }, take: 3 }),
    prisma.integrationSetting.findMany({
      where: { key: { in: ['smtp2go_api_key', 'keap_pat', 'eventbrite_token', 'xero_access_token', 'claude_api_key', 'graph_access_token'] } },
    }),
  ])

  const integrationStatus = (key: string) => {
    const s = integrations.find((i: { key: string; status: string }) => i.key === key)
    return s?.status || 'unconfigured'
  }

  const intStatusColor: Record<string, string> = {
    connected: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    unconfigured: 'bg-gray-100 text-gray-500',
  }

  const integrationList = [
    { key: 'smtp2go_api_key', label: 'SMTP2GO' },
    { key: 'keap_pat', label: 'Keap' },
    { key: 'eventbrite_token', label: 'Eventbrite' },
    { key: 'xero_access_token', label: 'Xero' },
    { key: 'claude_api_key', label: 'Claude AI' },
    { key: 'graph_access_token', label: 'Microsoft Graph' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{format(now, "EEEE d MMMM yyyy")}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Members', value: totalMembers, href: '/admin/members', color: 'text-blue-600' },
          { label: 'Active Groups', value: totalGroups, href: '/admin/groups', color: 'text-green-600' },
          { label: 'Published Events', value: totalEvents, href: '/admin/events', color: 'text-purple-600' },
          { label: 'Open Deals', value: openDeals, href: '/admin/pipeline', color: 'text-amber-600' },
          {
            label: 'Inbox Unread',
            value: unreadTickets,
            href: '/admin/inbox',
            color: unreadTickets > 0 ? 'text-red-600' : 'text-gray-600',
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500 uppercase font-medium">{stat.label}</div>
            <div className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tomorrow's Events */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {"Tomorrow's In-Person Events"}
            {tomorrowEvents.length > 0 && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {tomorrowEvents.length}
              </span>
            )}
          </h2>
          {tomorrowEvents.length === 0 ? (
            <p className="text-gray-400 text-sm">No in-person events tomorrow</p>
          ) : (
            <div className="space-y-3">
              {tomorrowEvents.map((event: { id: string; title: string; startDatetime: Date; location: string | null; group: { name: string } }) => (
                <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {event.group.name} &bull; {format(event.startDatetime, 'HH:mm')}
                      {event.location && <span> &bull; {event.location}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    <a
                      href={`/api/events/${event.id}/attendance-sheet`}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Download Sheet
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
            <Link href="/admin/settings/integrations" className="text-xs text-blue-600 hover:text-blue-800">Manage</Link>
          </div>
          <div className="space-y-2">
            {integrationList.map((int) => {
              const status = integrationStatus(int.key)
              return (
                <div key={int.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{int.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intStatusColor[status]}`}>
                    {status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Introductions</h2>
            <Link href="/admin/referrals" className="text-xs text-blue-600 hover:text-blue-800">New intro</Link>
          </div>
          {recentReferrals.length === 0 ? (
            <p className="text-gray-400 text-sm">No referrals yet</p>
          ) : (
            <div className="space-y-2">
              {recentReferrals.map((r: { id: string; sentAt: Date; personA: { firstName: string; lastName: string }; personB: { firstName: string; lastName: string } }) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{r.personA.firstName} {r.personA.lastName}</span>
                    <span className="text-gray-400 mx-2">↔</span>
                    <span className="font-medium text-gray-900">{r.personB.firstName} {r.personB.lastName}</span>
                  </div>
                  <div className="text-xs text-gray-400">{format(r.sentAt, 'dd MMM')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Logs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Syncs</h2>
            <form action="/api/admin/sync/keap" method="POST">
              <button type="submit" className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                Sync Keap
              </button>
            </form>
          </div>
          {recentSyncLogs.length === 0 ? (
            <p className="text-gray-400 text-sm">No sync history</p>
          ) : (
            <div className="space-y-2">
              {recentSyncLogs.map((log: { id: string; source: string; records: number; direction: string; syncedAt: Date; errors: string | null }) => (
                <div key={log.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900 capitalize">{log.source}</div>
                    <div className="text-xs text-gray-500">{log.records} records {log.direction}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{format(log.syncedAt, 'dd MMM HH:mm')}</div>
                    {log.errors && <div className="text-xs text-red-500">{log.errors.slice(0, 40)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
