'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Referral {
  id: string
  eventTitle: string | null
  eventDate: string | null
  personalNote: string | null
  sentAt: string
  smtp2goEmailId: string | null
  personA: { firstName: string; lastName: string; email: string }
  personB: { firstName: string; lastName: string; email: string }
}

export default function ReferralsHistoryPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/referrals')
      .then((r) => r.json())
      .then(setReferrals)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/referrals" className="text-gray-500 hover:text-gray-700 text-sm">← New Introduction</Link>
        <h1 className="text-2xl font-bold text-gray-900">Referrals History</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Person A</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Person B</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Event</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No referrals yet</td></tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{r.personA.firstName} {r.personA.lastName}</div>
                      <div className="text-xs text-gray-500">{r.personA.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{r.personB.firstName} {r.personB.lastName}</div>
                      <div className="text-xs text-gray-500">{r.personB.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {r.eventTitle || '—'}
                      {r.eventDate && <div className="text-xs text-gray-400">{format(new Date(r.eventDate), 'dd MMM yyyy')}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(r.sentAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{r.personalNote || '—'}</td>
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
