'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface EmailLog {
  id: string
  email: string
  type: string
  status: string
  sentAt: string
  openedAt: string | null
  smtp2goEmailId: string | null
  campaign?: { subject: string } | null
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/admin/email/logs')
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  const statusColors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-600',
    sent: 'bg-green-100 text-green-700',
    opened: 'bg-blue-100 text-blue-700',
    bounced: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <a href="/admin/email" className="text-gray-500 hover:text-gray-700 text-sm">Email</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No email logs yet</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{log.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{log.type}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[log.status] || 'bg-gray-100 text-gray-600'}`}>{log.status}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{format(new Date(log.sentAt), 'dd MMM HH:mm')}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {log.openedAt ? format(new Date(log.openedAt), 'dd MMM HH:mm') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
