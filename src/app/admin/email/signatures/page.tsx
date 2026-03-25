'use client'

import { useState, useEffect } from 'react'

interface Signature {
  id: string
  name: string
  htmlContent: string
  isDefault: boolean
  groupId: string | null
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Signature | null>(null)
  const [form, setForm] = useState({ name: '', htmlContent: '', isDefault: false, groupId: '' })

  useEffect(() => {
    fetch('/api/admin/email/signatures')
      .then((r) => r.json())
      .then(setSignatures)
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { id: editing.id, ...form } : form
    const res = await fetch('/api/admin/email/signatures', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const saved = await res.json()
      if (editing) {
        setSignatures(signatures.map((s) => s.id === saved.id ? saved : s))
      } else {
        setSignatures([...signatures, saved])
      }
      setShowCreate(false)
      setEditing(null)
      setForm({ name: '', htmlContent: '', isDefault: false, groupId: '' })
    }
  }

  async function deleteSig(id: string) {
    await fetch(`/api/admin/email/signatures?id=${id}`, { method: 'DELETE' })
    setSignatures(signatures.filter((s) => s.id !== id))
  }

  function startEdit(sig: Signature) {
    setEditing(sig)
    setForm({ name: sig.name, htmlContent: sig.htmlContent, isDefault: sig.isDefault, groupId: sig.groupId || '' })
    setShowCreate(true)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <a href="/admin/email" className="text-gray-500 hover:text-gray-700 text-sm">Email</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Signatures</h1>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditing(null); setForm({ name: '', htmlContent: '', isDefault: false, groupId: '' }); setShowCreate(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          New Signature
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">{editing ? 'Edit Signature' : 'Create Signature'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default signature</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
              <textarea
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="<div><strong>Your Name</strong><br>IWant2Network<br>your@email.com</div>"
              />
            </div>
            {form.htmlContent && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" dangerouslySetInnerHTML={{ __html: form.htmlContent }} />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={!form.name || !form.htmlContent} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : signatures.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No signatures yet</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {signatures.map((sig) => (
            <div key={sig.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{sig.name}</h3>
                  {sig.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(sig)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => deleteSig(sig.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm" dangerouslySetInnerHTML={{ __html: sig.htmlContent }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
