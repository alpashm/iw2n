import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    redirect('/auth/signin')
  }
  if ((session.user as any)?.mustChangePassword) {
    redirect('/auth/change-password')
  }

  const unreadCount = await prisma.ticket.count({
    where: { status: { in: ['new', 'open', 'ai-draft-ready'] } },
  }).catch(() => 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold text-gray-900">IW2N EMS</span>
              <div className="hidden md:flex gap-5 text-sm">
                <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/admin/groups" className="text-gray-600 hover:text-gray-900">Groups</a>
                <a href="/admin/events" className="text-gray-600 hover:text-gray-900">Events</a>
                <a href="/admin/pipeline" className="text-gray-600 hover:text-gray-900">Pipeline</a>
                <a href="/admin/packages" className="text-gray-600 hover:text-gray-900">Packages</a>
                <a href="/admin/members" className="text-gray-600 hover:text-gray-900">Members</a>
                <a href="/admin/xero" className="text-gray-600 hover:text-gray-900">Xero</a>
                <a href="/admin/referrals" className="text-gray-600 hover:text-gray-900">Referrals</a>
                <a href="/admin/email" className="text-gray-600 hover:text-gray-900">Email</a>
                <a href="/admin/inbox" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  Inbox
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                      {unreadCount}
                    </span>
                  )}
                </a>
                <a href="/admin/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
              </div>
            </div>
            <div className="text-sm text-gray-500">{(session.user as any)?.email}</div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
