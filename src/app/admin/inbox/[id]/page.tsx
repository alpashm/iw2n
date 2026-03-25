'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface Ticket {
  id: string
  fromName: string
  fromEmail: string
  subject: string
  bodyHtml: string
  status: string
  receivedAt: string
  aiDraft: string | null
  notes: string | null
  tag: string | null
  repliedAt: string | null
}

const STATUS_FLOW = ['new', 'open', 'ai-draft-ready', 'replied', 'closed']
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  open: 'bg-amber-100 text-amber-700',
  'ai-draft-ready': 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyHtml, setReplyHtml] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [aiMode, setAiMode] = useState<'display' | 'edit' | null>(null)
  const [editedDraft, setEditedDraft] = useState('')

  useEffect(() => {
    fetch(`/api/admin/tickets/${id}`)
      .then((r) => r.json())
      .then((t) => {
        setTicket(t)
        setNotes(t.notes || '')
        if (t.aiDraft) {
          setAiMode('display')
          setEditedDraft(t.aiDraft)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(status: string) {
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setTicket({ ...ticket!, status })
  }

  async function saveNotes() {
    setSavingNote(true)
    await fetch(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNote(false)
  }

  async function sendReply() {
    if (!replyHtml.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyHtml, subject: `Re: ${ticket?.subject}` }),
      })
      if (res.ok) {
        setTicket({ ...ticket!, status: 'replied', repliedAt: new Date().toISOString() })
        setReplyHtml('')
      } else {
        const d = await res.json()
        alert('Send failed: ' + d.error)
      }
    } finally {
      setSending(false)
    }
  }

  function useDraft() {
    setReplyHtml(ticket?.aiDraft || '')
    setAiMode(null)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!ticket) return <div className="text-center py-12 text-red-500">Ticket not found</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/inbox" className="text-gray-500 hover:text-gray-700 text-sm">← Inbox</Link>
        <h1 className="text-xl font-bold text-gray-900 truncate">{ticket.subject}</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* Original Email */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{ticket.fromName} &lt;{ticket.fromEmail}&gt;</div>
                  <div className="text-sm text-gray-500">{format(new Date(ticket.receivedAt), 'EEEE d MMMM yyyy HH:mm')}</div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: ticket.bodyHtml }} />
            </div>
          </div>

          {/* AI Draft */}
          {ticket.aiDraft && aiMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-blue-800">AI Draft Reply</h3>
                <div className="flex gap-2">
                  <button onClick={useDraft} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Use Draft</button>
                  <button onClick={() => setAiMode('edit')} className="text-xs bg-white text-blue-700 border border-blue-300 px-3 py-1 rounded-lg hover:bg-blue-50">Edit</button>
                  <button onClick={() => setAiMode(null)} className="text-xs text-blue-500 hover:text-blue-700">Discard</button>
                </div>
              </div>
              {aiMode === 'edit' ? (
                <textarea value={editedDraft} onChange={(e) => setEditedDraft(e.target.value)} rows={6} className="w-full border border-blue-200 rounded-lg p-3 text-sm bg-white" />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.aiDraft}</div>
              )}
            </div>
          )}

          {/* Reply Composer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Reply</h3>
            <textarea
              value={replyHtml}
              onChange={(e) => setReplyHtml(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 font-mono"
              placeholder="Type your reply (HTML supported)..."
            />
            <div className="flex gap-2">
              <button onClick={sendReply} disabled={sending || !replyHtml.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
              {ticket.aiDraft && (
                <button onClick={() => { setReplyHtml(ticket.aiDraft!); setAiMode(null) }} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Load AI Draft
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-1">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ticket.status === s ? `${STATUS_COLORS[s]} font-medium` : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tag */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
            <select
              value={ticket.tag || ''}
              onChange={async (e) => {
                await fetch(`/api/admin/tickets/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tag: e.target.value }),
                })
                setTicket({ ...ticket, tag: e.target.value })
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Uncategorised</option>
              <option value="enquiry">Enquiry</option>
              <option value="sponsorship">Sponsorship</option>
              <option value="speaker">Speaker</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Internal Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
              placeholder="Internal notes (not visible to sender)..."
            />
            <button onClick={saveNotes} disabled={savingNote} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50">
              {savingNote ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {ticket.repliedAt && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
              Replied {format(new Date(ticket.repliedAt), 'dd MMM yyyy HH:mm')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
