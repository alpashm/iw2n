'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface MemberData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  keapContactId: string | null
  xeroContactId: string | null
  createdAt: string
  memberships: Array<{
    id: string
    status: string
    joinedAt: string
    unsubscribedAt: string | null
    group: { id: string; name: string; slug: string }
  }>
  memberPackages: Array<{
    id: string
    status: string
    startedAt: string
    expiresAt: string | null
    package: { id: string; name: string; price: number; billingType: string }
  }>
  xeroLink: {
    matchStatus: string
    confirmedAt: string | null
    xeroContact: { name: string; email: string | null }
  } | null
  keapData: {
    keapId: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    company: string | null
    tags: number[]
    lastSyncedAt: string
  } | null
  xeroInvoices: Array<{
    InvoiceID: string
    InvoiceNumber: string
    Type: string
    Status: string
    Total: number
    AmountDue: number
    DueDate?: string
  }> | null
}

export default function MemberDetailPage() {
  const { id } = useParams()
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/members/${id}`)
      .then((r) => r.json())
      .then(setMember)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!member) return <div className="text-center py-12 text-red-500">Member not found</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/members" className="text-gray-500 hover:text-gray-700 text-sm">← Members</Link>
        <h1 className="text-2xl font-bold text-gray-900">{member.firstName} {member.lastName}</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          {/* EMS Profile */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="text-sm text-gray-900 mt-0.5">{member.email}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Role</dt><dd className="text-sm text-gray-900 mt-0.5">{member.role}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Member Since</dt><dd className="text-sm text-gray-900 mt-0.5">{format(new Date(member.createdAt), 'dd MMM yyyy')}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Keap ID</dt><dd className="text-sm text-gray-900 mt-0.5">{member.keapContactId || '—'}</dd></div>
            </dl>
          </div>

          {/* Keap Data (Read-only) */}
          {member.keapData && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Keap CRM Data</h2>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">Read Only</span>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-xs text-gray-500 uppercase">Name</dt><dd className="text-sm text-gray-900 mt-0.5">{member.keapData.firstName} {member.keapData.lastName}</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="text-sm text-gray-900 mt-0.5">{member.keapData.email}</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase">Phone</dt><dd className="text-sm text-gray-900 mt-0.5">{member.keapData.phone || '—'}</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase">Company</dt><dd className="text-sm text-gray-900 mt-0.5">{member.keapData.company || '—'}</dd></div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Tags</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {(member.keapData.tags as number[]).map((t, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                    {(member.keapData.tags as number[]).length === 0 && <span className="text-sm text-gray-400">No tags</span>}
                  </dd>
                </div>
                <div><dt className="text-xs text-gray-500 uppercase">Last Synced</dt><dd className="text-sm text-gray-900 mt-0.5">{format(new Date(member.keapData.lastSyncedAt), 'dd MMM yyyy HH:mm')}</dd></div>
              </dl>
            </div>
          )}

          {/* Xero Invoices */}
          {member.xeroLink && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Xero Invoices</h2>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.xeroLink.matchStatus === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {member.xeroLink.matchStatus}
                </span>
              </div>
              {member.xeroLink.xeroContact && (
                <p className="text-sm text-gray-500 mb-4">Linked to: {member.xeroLink.xeroContact.name}</p>
              )}
              {member.xeroInvoices && member.xeroInvoices.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="text-left pb-2">Invoice #</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-left pb-2">Total</th>
                      <th className="text-left pb-2">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {member.xeroInvoices.map((inv) => (
                      <tr key={inv.InvoiceID}>
                        <td className="py-2 font-medium">{inv.InvoiceNumber}</td>
                        <td className="py-2 text-gray-600">{inv.Status}</td>
                        <td className="py-2">£{inv.Total.toLocaleString()}</td>
                        <td className="py-2 text-gray-600">{inv.AmountDue > 0 ? `£${inv.AmountDue.toLocaleString()} due` : 'Paid'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No invoices found</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Group Memberships */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Groups</h3>
            {member.memberships.length === 0 ? (
              <p className="text-sm text-gray-400">No group memberships</p>
            ) : (
              <div className="space-y-2">
                {member.memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.group.name}</div>
                      <div className="text-xs text-gray-400">Joined {format(new Date(m.joinedAt), 'dd MMM yyyy')}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === 'active' && !m.unsubscribedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.unsubscribedAt ? 'unsub' : m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Packages */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Packages</h3>
            {member.memberPackages.length === 0 ? (
              <p className="text-sm text-gray-400">No packages</p>
            ) : (
              <div className="space-y-2">
                {member.memberPackages.map((mp) => (
                  <div key={mp.id}>
                    <div className="text-sm font-medium text-gray-900">{mp.package.name}</div>
                    <div className="text-xs text-gray-500">£{mp.package.price} / {mp.package.billingType}</div>
                    {mp.expiresAt && (
                      <div className="text-xs text-gray-400">Expires {format(new Date(mp.expiresAt), 'dd MMM yyyy')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
