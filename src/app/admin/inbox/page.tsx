'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Ticket {
  id: string
  fromName: string
  fromEmail: string
  subject: string
  status: string
  receivedAt: string
  tag: string | null
  aiDraft: string | null
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  open: 'bg-amber-100 text-amber-700',
  'ai-draft-ready': 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function InboxPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadTickets() }, [])

  async function loadTickets(status = '') {
    setLoading(true)
    const res = await fetch(`/api/admin/tickets${status ? `?status=${status}` : ''}`)
    const data = await res.json()
    setTickets(data)
    setLoading(false)
  }

  const unread = tickets.filter((t) => t.status === 'new' || t.status === 'open' || t.status === 'ai-draft-ready').length
  const filtered = filter ? tickets.filter((t) => t.status === filter) : tickets

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>}
        </div>
        <button onClick={() => loadTickets(filter)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'new', 'open', 'ai-draft-ready', 'replied', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); loadTickets(s) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s || 'All'} ({s ? tickets.filter((t) => t.status === s).length : tickets.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">From</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Subject</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Received</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No tickets found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50 ${t.status === 'new' ? 'font-medium' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{t.fromName}</div>
                      <div className="text-xs text-gray-500">{t.fromEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.subject}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>{t.status}</span>
                        {t.aiDraft && <span className="text-xs text-blue-500">AI draft</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(t.receivedAt), 'dd MMM HH:mm')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/inbox/${t.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Open</Link>
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
