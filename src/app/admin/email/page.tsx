import Link from 'next/link'

export default function EmailHubPage() {
  const modules = [
    { href: '/admin/email/templates', title: 'Templates', description: 'Create and manage email templates with rich HTML editor', icon: '📄' },
    { href: '/admin/email/campaigns', title: 'Campaigns', description: 'Compose and send bulk email campaigns to groups', icon: '📧' },
    { href: '/admin/email/signatures', title: 'Signatures', description: 'Manage email signatures for different senders/groups', icon: '✍️' },
    { href: '/admin/email/logs', title: 'Email Logs', description: 'View sent email history and delivery status', icon: '📋' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Platform</h1>
      <p className="text-gray-500 mb-8">Manage templates, campaigns, signatures and email logs.</p>
      <div className="grid grid-cols-2 gap-6">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">{m.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{m.title}</h2>
            <p className="text-sm text-gray-500">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
