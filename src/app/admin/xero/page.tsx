'use client'

import { useState, useEffect } from 'react'

interface XeroContact {
  xeroContactId: string
  name: string
  email: string | null
  company: string | null
  outstandingBalance: number
  xeroLink?: {
    matchStatus: string
    emsUserId: string
    confirmedAt: string | null
  } | null
}

interface EmsUser {
  id: string
  firstName: string
  lastName: string
  email: string
  xeroLink?: {
    matchStatus: string
    xeroContactId: string
  } | null
}

export default function XeroLinkingPage() {
  const [xeroContacts, setXeroContacts] = useState<XeroContact[]>([])
  const [emsUsers, setEmsUsers] = useState<EmsUser[]>([])
  const [xeroSearch, setXeroSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<{ xeroContactsSynced: number; autoMatched: number; possibleMatches: number } | null>(null)
  const [selectedXero, setSelectedXero] = useState<XeroContact | null>(null)
  const [selectedUser, setSelectedUser] = useState<EmsUser | null>(null)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [usersRes] = await Promise.all([
      fetch('/api/admin/members'),
    ])
    const users = await usersRes.json()
    setEmsUsers(users)
  }

  async function runAutoMatch() {
    setMatching(true)
    try {
      const res = await fetch('/api/admin/xero/match', { method: 'POST' })
      const result = await res.json()
      setMatchResult(result)
      loadData()
    } finally {
      setMatching(false)
    }
  }

  async function confirmLink() {
    if (!selectedXero || !selectedUser) return
    setLinking(true)
    try {
      await fetch('/api/admin/xero/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emsUserId: selectedUser.id,
          xeroContactId: selectedXero.xeroContactId,
          action: 'confirm',
        }),
      })
      setSelectedXero(null)
      setSelectedUser(null)
      loadData()
    } finally {
      setLinking(false)
    }
  }

  async function rejectLink(emsUserId: string) {
    await fetch('/api/admin/xero/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emsUserId, action: 'reject' }),
    })
    loadData()
  }

  const filteredUsers = emsUsers.filter((u) => {
    if (!userSearch) return true
    const term = userSearch.toLowerCase()
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  })

  const pendingLinks = emsUsers.filter((u) =>
    u.xeroLink?.matchStatus === 'auto-matched-pending' || u.xeroLink?.matchStatus === 'possible-match'
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Xero Client Linking</h1>
        <button
          onClick={runAutoMatch}
          disabled={matching}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {matching ? 'Running Auto-Match...' : 'Run Auto-Match'}
        </button>
      </div>

      {matchResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          Auto-match complete: {matchResult.xeroContactsSynced} Xero contacts synced, {matchResult.autoMatched} auto-matched, {matchResult.possibleMatches} possible matches
        </div>
      )}

      {/* Pending Links */}
      {pendingLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Pending Confirmations ({pendingLinks.length})</h2>
          <div className="space-y-3">
            {pendingLinks.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                  <span className="text-sm text-gray-500 ml-2">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    user.xeroLink?.matchStatus === 'auto-matched-pending' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {user.xeroLink?.matchStatus}
                  </span>
                  <span className="text-sm text-gray-500">Xero: {user.xeroLink?.xeroContactId}</span>
                  <button
                    onClick={() => fetch('/api/admin/xero/link', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ emsUserId: user.id, xeroContactId: user.xeroLink?.xeroContactId, action: 'confirm' }),
                    }).then(loadData)}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-200"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => rejectLink(user.id)}
                    className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual linking */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">EMS Members</h2>
          <input
            type="text"
            placeholder="Search members..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === u.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{u.firstName} {u.lastName}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
                {u.xeroLink && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    u.xeroLink.matchStatus === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {u.xeroLink.matchStatus}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Manual Link</h2>
          {selectedUser && selectedXero ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600 mb-2">EMS Member</div>
                <div className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600 mb-2">Xero Contact</div>
                <div className="font-semibold">{selectedXero.name}</div>
                <div className="text-sm text-gray-500">{selectedXero.email || 'No email'}</div>
              </div>
              <button
                onClick={confirmLink}
                disabled={linking}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {linking ? 'Linking...' : 'Confirm Link'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Select an EMS member to manually link with a Xero contact
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
