'use client'

import { useState, useEffect } from 'react'

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  billingType: string
  status: string
  _count: { memberPackages: number }
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', billingType: 'monthly' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/packages')
      .then((r) => r.json())
      .then(setPackages)
      .finally(() => setLoading(false))
  }, [])

  async function createPackage() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) }),
      })
      if (res.ok) {
        const pkg = await res.json()
        setPackages([...packages, { ...pkg, _count: { memberPackages: 0 } }])
        setShowCreate(false)
        setForm({ name: '', description: '', price: '', billingType: 'monthly' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function archivePackage(id: string) {
    await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' })
    setPackages(packages.map((p) => p.id === id ? { ...p, status: 'archived' } : p))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Membership Packages</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          New Package
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create Package</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
              <select value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="one-off">One-off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createPackage} disabled={saving || !form.name || !form.price} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Package'}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {packages.filter((p) => p.status === 'active').map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                <span className="text-lg font-bold text-gray-900">£{pkg.price}</span>
              </div>
              {pkg.description && <p className="text-sm text-gray-500 mb-3">{pkg.description}</p>}
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{pkg.billingType}</span>
                <span>{pkg._count.memberPackages} members</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={async () => {
                    const userId = prompt('Enter User ID to assign:')
                    if (!userId) return
                    await fetch(`/api/admin/packages/${pkg.id}/assign`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId }),
                    })
                    alert('Package assigned!')
                  }}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100"
                >
                  Assign to Member
                </button>
                <button onClick={() => archivePackage(pkg.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
