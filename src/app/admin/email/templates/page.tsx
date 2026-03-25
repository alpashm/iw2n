'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Template {
  id: string
  name: string
  category: string
  subject: string
  createdAt: string
  updatedAt: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'transactional', subject: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const res = await fetch('/api/admin/email/templates')
    const data = await res.json()
    setTemplates(data)
    setLoading(false)
  }

  async function createTemplate() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, htmlBody: `<p>Edit this template...</p>` }),
      })
      if (res.ok) {
        const t = await res.json()
        window.location.href = `/admin/email/templates/${t.id}`
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = templates.filter((t) =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) || t.category.includes(filter)
  )

  const categoryColors: Record<string, string> = {
    transactional: 'bg-blue-100 text-blue-700',
    bulk: 'bg-purple-100 text-purple-700',
    referral: 'bg-green-100 text-green-700',
    reminder: 'bg-amber-100 text-amber-700',
    welcome: 'bg-teal-100 text-teal-700',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/email" className="text-gray-500 hover:text-gray-700 text-sm">Email</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
      </div>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72"
        />
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          New Template
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">Create Template</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="transactional">Transactional</option>
                <option value="bulk">Bulk</option>
                <option value="referral">Referral</option>
                <option value="reminder">Reminder</option>
                <option value="welcome">Welcome</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={createTemplate} disabled={saving || !form.name || !form.subject} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : 'Create & Edit'}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Subject</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Updated</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No templates found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[t.category] || 'bg-gray-100 text-gray-600'}`}>{t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(t.updatedAt), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/email/templates/${t.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</Link>
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
