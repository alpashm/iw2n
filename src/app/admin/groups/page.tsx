'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  slug: string
  type: string
  status: string
  keapTagId: string | null
  _count: { memberships: number; events: number }
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', type: 'in-person', description: '', keapTagId: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/groups')
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  async function createGroup() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const g = await res.json()
        setGroups([...groups, { ...g, _count: { memberships: 0, events: 0 } }])
        setShowCreate(false)
        setForm({ name: '', slug: '', type: 'in-person', description: '', keapTagId: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  const typeColors: Record<string, string> = {
    'in-person': 'bg-green-100 text-green-800',
    online: 'bg-blue-100 text-blue-800',
    hybrid: 'bg-purple-100 text-purple-800',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Group
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create Group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setForm({ ...form, name, slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-') })
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. London Thursday"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="in-person">In-person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keap Tag ID</label>
              <input
                type="text"
                value={form.keapTagId}
                onChange={(e) => setForm({ ...form, keapTagId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={createGroup}
              disabled={saving || !form.name || !form.slug}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Group'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No groups yet. Create your first group.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Members</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Events</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Keap Tag</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{g.name}</div>
                    <div className="text-sm text-gray-500">{g.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[g.type] || 'bg-gray-100 text-gray-700'}`}>
                      {g.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{g._count.memberships}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{g._count.events}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{g.keapTagId || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/groups/${g.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
