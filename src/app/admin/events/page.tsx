'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  type: string
  status: string
  startDatetime: string
  endDatetime: string
  location: string | null
  group: { id: string; name: string; slug: string }
  _count: { attendees: number }
}

interface Group {
  id: string
  name: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ groupId: '', status: '', search: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    groupId: '',
    type: 'in-person',
    startDatetime: '',
    endDatetime: '',
    location: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/groups').then((r) => r.json()).then(setGroups)
    loadEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvents() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.groupId) params.set('groupId', filter.groupId)
    if (filter.status) params.set('status', filter.status)
    const res = await fetch(`/api/admin/events?${params}`)
    const data = await res.json()
    setEvents(data)
    setLoading(false)
  }

  async function createEvent() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreate(false)
        loadEvents()
      }
    } finally {
      setSaving(false)
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  }

  const filteredEvents = events.filter((e) =>
    filter.search ? e.title.toLowerCase().includes(filter.search.toLowerCase()) : true
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
        />
        <select
          value={filter.groupId}
          onChange={(e) => setFilter({ ...filter, groupId: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={loadEvents} className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
          Filter
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create Event</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select group</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="in-person">In-person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="datetime-local" value={form.startDatetime} onChange={(e) => setForm({ ...form, startDatetime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input type="datetime-local" value={form.endDatetime} onChange={(e) => setForm({ ...form, endDatetime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createEvent} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading events...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Event</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Group</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Attendees</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No events found</td></tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{e.title}</div>
                      {e.location && <div className="text-xs text-gray-500">{e.location}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{e.group.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(e.startDatetime), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{e.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{e._count.attendees}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[e.status] || 'bg-gray-100 text-gray-700'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/events/${e.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Manage
                      </Link>
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
