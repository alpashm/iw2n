import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">IWant2Network</span>
              <div className="hidden md:flex gap-6 text-sm">
                <a href="/portal/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/portal/calendar" className="text-gray-600 hover:text-gray-900">Calendar</a>
                <a href="/portal/profile" className="text-gray-600 hover:text-gray-900">Profile</a>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{session.user?.email}</span>
              <a href="/api/auth/signout" className="text-gray-500 hover:text-gray-700">Sign out</a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
