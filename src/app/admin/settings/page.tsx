import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/settings/integrations" className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
          <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">Configure SMTP2GO, Xero, Eventbrite, Microsoft Graph, Claude &amp; OpenAI.</p>
        </Link>
      </div>
    </div>
  )
}
