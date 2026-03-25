'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface Attendee {
  id: string
  userId: string | null
  name: string
  email: string
  ticketType: string | null
  checkedIn: boolean
  registeredAt: string
  icsSent: boolean
}

interface Event {
  id: string
  title: string
  description: string | null
  startDatetime: string
  endDatetime: string
  timezone: string
  location: string | null
  onlineLink: string | null
  type: string
  status: string
  eventbriteEventId: string | null
  eventbriteUrl: string | null
  group: { id: string; name: string; slug: string }
  attendees: Attendee[]
}

export default function EventDetailPage() {
  const { id } = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Event>>({})
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then((r) => r.json())
      .then((e) => {
        setEvent(e)
        setForm({
          title: e.title,
          description: e.description,
          status: e.status,
          type: e.type,
          location: e.location,
          onlineLink: e.onlineLink,
          eventbriteEventId: e.eventbriteEventId,
          eventbriteUrl: e.eventbriteUrl,
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  async function saveEvent() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setEvent({ ...event!, ...updated })
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleCheckIn(attendeeId: string, checked: boolean) {
    setCheckingIn(attendeeId)
    try {
      await fetch(`/api/admin/events/${id}/attendees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeId, checkedIn: !checked }),
      })
      setEvent({
        ...event!,
        attendees: event!.attendees.map((a) =>
          a.id === attendeeId ? { ...a, checkedIn: !checked } : a
        ),
      })
    } finally {
      setCheckingIn(null)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!event) return <div className="text-center py-12 text-red-500">Event not found</div>

  const checkedInCount = event.attendees.filter((a) => a.checkedIn).length

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/events" className="text-gray-500 hover:text-gray-700 text-sm">← Events</Link>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          event.status === 'published' ? 'bg-green-100 text-green-700' :
          event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>{event.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Event Details */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Online Link</label>
                <input type="text" value={form.onlineLink || ''} onChange={(e) => setForm({ ...form, onlineLink: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eventbrite Event ID</label>
                <input type="text" value={form.eventbriteEventId || ''} onChange={(e) => setForm({ ...form, eventbriteEventId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eventbrite URL</label>
                <input type="text" value={form.eventbriteUrl || ''} onChange={(e) => setForm({ ...form, eventbriteUrl: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={saveEvent} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {event.type === 'in-person' && (
                <a
                  href={`/api/events/${id}/attendance-sheet`}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Download Attendance Sheet
                </a>
              )}
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Attendees ({event.attendees.length})</h2>
              <span className="text-sm text-gray-500">Checked in: {checkedInCount}/{event.attendees.length}</span>
            </div>
            {event.attendees.length === 0 ? (
              <p className="text-sm text-gray-500">No attendees yet</p>
            ) : (
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="text-left pb-2">Name</th>
                    <th className="text-left pb-2">Email</th>
                    <th className="text-left pb-2">Ticket</th>
                    <th className="text-left pb-2">ICS</th>
                    <th className="text-center pb-2">Check In</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {event.attendees.map((a) => (
                    <tr key={a.id} className={a.checkedIn ? 'bg-green-50' : ''}>
                      <td className="py-2 text-sm font-medium text-gray-900">{a.name}</td>
                      <td className="py-2 text-sm text-gray-500">{a.email}</td>
                      <td className="py-2 text-sm text-gray-500">{a.ticketType || '—'}</td>
                      <td className="py-2">
                        {a.icsSent ? (
                          <span className="text-xs text-green-600">Sent</span>
                        ) : (
                          <span className="text-xs text-gray-400">Not sent</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => toggleCheckIn(a.id, a.checkedIn)}
                          disabled={checkingIn === a.id}
                          className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors ${
                            a.checkedIn ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {a.checkedIn ? '✓' : '○'}
                        </button>
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/admin/referrals?personAId=${a.userId || ''}&eventId=${event.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Introduce
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Event Info</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Group</dt>
                <dd className="text-gray-900 font-medium">{event.group.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Start</dt>
                <dd className="text-gray-900">{format(new Date(event.startDatetime), 'dd MMM yyyy HH:mm')}</dd>
              </div>
              <div>
                <dt className="text-gray-500">End</dt>
                <dd className="text-gray-900">{format(new Date(event.endDatetime), 'dd MMM yyyy HH:mm')}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{event.type}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
