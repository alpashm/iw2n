'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  status: string
  keapTagId: string | null
  timezone: string
  calendarVisibility: string
  memberships: Array<{
    id: string
    status: string
    joinedAt: string
    user: { id: string; firstName: string; lastName: string; email: string }
  }>
}

export default function GroupDetailPage() {
  const { id } = useParams()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Group>>({})

  useEffect(() => {
    fetch(`/api/admin/groups/${id}`)
      .then((r) => r.json())
      .then((g) => {
        setGroup(g)
        setForm({
          name: g.name,
          slug: g.slug,
          description: g.description,
          type: g.type,
          status: g.status,
          keapTagId: g.keapTagId,
          timezone: g.timezone,
          calendarVisibility: g.calendarVisibility,
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  async function saveGroup() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setGroup({ ...group!, ...updated })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!group) return <div className="text-center py-12 text-red-500">Group not found</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/groups" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Groups
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Group Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug || ''}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type || 'in-person'}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="in-person">In-person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status || 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keap Tag ID</label>
              <input
                type="text"
                value={form.keapTagId || ''}
                onChange={(e) => setForm({ ...form, keapTagId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Tag ID for auto membership sync"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Visibility</label>
              <select
                value={form.calendarVisibility || 'members'}
                onChange={(e) => setForm({ ...form, calendarVisibility: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="members">Members only</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <input
                type="text"
                value={form.timezone || 'Europe/London'}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={saveGroup}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">iCal Feed URL</h3>
            <code className="text-xs bg-gray-100 px-3 py-2 rounded block text-gray-600">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/{group.slug}/feed
            </code>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Members ({group.memberships.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {group.memberships.length === 0 ? (
              <p className="text-sm text-gray-500">No members yet</p>
            ) : (
              group.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {m.user.firstName} {m.user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{m.user.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
