'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  keapContactId: string | null
  xeroContactId: string | null
  memberships: Array<{ group: { name: string } }>
  memberPackages: Array<{ status: string; package: { name: string } }>
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function loadMembers(s = '') {
    setLoading(true)
    const res = await fetch(`/api/admin/members${s ? `?search=${encodeURIComponent(s)}` : ''}`)
    const data = await res.json()
    setMembers(data)
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="text-sm text-gray-500">{members.length} members</div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadMembers(search)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-sm"
        />
        <button onClick={() => loadMembers(search)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading members...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Groups</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Package</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Keap</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Xero</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No members found</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                      <div className="text-xs text-gray-400">{m.role}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {m.memberships.slice(0, 3).map((mem, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{mem.group.name}</span>
                        ))}
                        {m.memberships.length > 3 && <span className="text-xs text-gray-400">+{m.memberships.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {m.memberPackages.find((p) => p.status === 'active')?.package.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {m.keapContactId ? (
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" title={m.keapContactId}></span>
                      ) : (
                        <span className="w-2 h-2 bg-gray-300 rounded-full inline-block"></span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {m.xeroContactId ? (
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" title={m.xeroContactId}></span>
                      ) : (
                        <span className="w-2 h-2 bg-gray-300 rounded-full inline-block"></span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/members/${m.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</Link>
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
