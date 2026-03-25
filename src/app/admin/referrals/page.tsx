'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { substituteTokens } from '@/lib/email/tokens'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  source: 'ems' | 'keap'
  tags?: number[]
}

interface EbEvent {
  id: string
  name: { text: string }
  start: { local: string }
}

interface Template {
  id: string
  name: string
  subject: string
  htmlBody: string
}

export default function ReferralsPage() {
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [resultsA, setResultsA] = useState<Contact[]>([])
  const [resultsB, setResultsB] = useState<Contact[]>([])
  const [personA, setPersonA] = useState<Contact | null>(null)
  const [personB, setPersonB] = useState<Contact | null>(null)
  const [events, setEvents] = useState<EbEvent[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [preview, setPreview] = useState('')
  const [sending, setSending] = useState(false)
  const [dupWarning, setDupWarning] = useState(false)

  useEffect(() => {
    fetch('/api/admin/email/templates?category=referral').then((r) => r.json()).then(setTemplates)
  }, [])

  async function searchContacts(query: string, side: 'A' | 'B') {
    if (!query.trim()) { side === 'A' ? setResultsA([]) : setResultsB([]); return }
    const res = await fetch(`/api/admin/members?search=${encodeURIComponent(query)}`)
    const users = await res.json()
    const contacts: Contact[] = users.map((u: any) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      source: 'ems' as const,
    }))
    side === 'A' ? setResultsA(contacts) : setResultsB(contacts)
  }

  function selectContact(contact: Contact, side: 'A' | 'B') {
    side === 'A' ? setPersonA(contact) : setPersonB(contact)
    side === 'A' ? setResultsA([]) : setResultsB([])
    side === 'A' ? setSearchA('') : setSearchB('')
  }

  useEffect(() => {
    if (personA && personB && selectedTemplate) {
      const t = templates.find((x) => x.id === selectedTemplate)
      if (t) {
        const ev = events.find((e) => e.id === selectedEvent)
        const html = substituteTokens(t.htmlBody, {
          introPersonAName: personA.firstName,
          introPersonBName: personB.firstName,
          introPersonACompany: personA.company || '',
          introPersonBCompany: personB.company || '',
          introEventTitle: ev?.name?.text || '',
          introEventDate: ev ? new Date(ev.start.local) : undefined,
          personalNote: personalNote || '',
        } as any)
        setPreview(html)
      }
    }
  }, [personA, personB, selectedTemplate, selectedEvent, personalNote, templates, events])

  async function checkDuplicate() {
    if (!personA || !personB) return false
    const res = await fetch(`/api/admin/referrals?personId=${personA.id}`)
    const refs = await res.json()
    const dup = refs.some((r: any) =>
      (r.personAId === personA.id && r.personBId === personB.id) ||
      (r.personAId === personB.id && r.personBId === personA.id)
    )
    setDupWarning(dup)
    return dup
  }

  async function sendReferral() {
    if (!personA || !personB) return alert('Select both contacts')
    const isDup = await checkDuplicate()
    if (isDup && !confirm('A referral between these two contacts already exists. Send anyway?')) return

    setSending(true)
    try {
      const ev = events.find((e) => e.id === selectedEvent)
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personAId: personA.id,
          personBId: personB.id,
          eventbriteEventId: selectedEvent || null,
          eventTitle: ev?.name?.text || null,
          eventDate: ev ? ev.start.local : null,
          templateId: selectedTemplate || null,
          personalNote: personalNote || null,
        }),
      })
      if (res.ok) {
        alert('Introduction sent successfully!')
        setPersonA(null); setPersonB(null); setSelectedEvent(''); setPersonalNote(''); setPreview('')
      } else {
        const d = await res.json()
        alert('Error: ' + d.error)
      }
    } finally {
      setSending(false)
    }
  }

  const SearchPanel = ({ side, search, setSearch, results, onSelect, selected }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Person {side}</h3>
      {selected ? (
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <div className="flex justify-between">
            <div>
              <div className="font-medium text-gray-900">{selected.firstName} {selected.lastName}</div>
              <div className="text-sm text-gray-500">{selected.email}</div>
              {selected.company && <div className="text-sm text-gray-500">{selected.company}</div>}
            </div>
            <button onClick={() => side === 'A' ? setPersonA(null) : setPersonB(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); searchContacts(e.target.value, side) }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
          />
          {results.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {results.map((c: Contact) => (
                <div key={c.id} onClick={() => onSelect(c, side)} className="p-2 hover:bg-blue-50 cursor-pointer">
                  <div className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Introduction</h1>
        <Link href="/admin/referrals/history" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          View History
        </Link>
      </div>

      {dupWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          Warning: A referral between these two contacts may already exist.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <SearchPanel side="A" search={searchA} setSearch={setSearchA} results={resultsA} onSelect={selectContact} selected={personA} />
        <SearchPanel side="B" search={searchB} setSearch={setSearchB} results={resultsB} onSelect={selectContact} selected={personB} />
      </div>

      {personA && personB && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold mb-3">Referral Details</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Default introduction email</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Note</label>
                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Add a personal note..."
                  />
                </div>

                <button
                  onClick={sendReferral}
                  disabled={sending}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Introduction'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Email Preview</h3>
            {preview ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                Preview will appear here
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
