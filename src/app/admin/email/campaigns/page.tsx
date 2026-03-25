'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { substituteTokens } from '@/lib/email/tokens'

interface Campaign {
  id: string
  subject: string
  status: string
  senderName: string
  senderEmail: string
  sentAt: string | null
  scheduledAt: string | null
  group: { id: string; name: string } | null
  _count: { emailLogs: number }
}

interface Group { id: string; name: string }
interface Template { id: string; name: string; subject: string; htmlBody: string }
interface Signature { id: string; name: string; htmlContent: string }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [form, setForm] = useState({
    groupId: '',
    templateId: '',
    signatureId: '',
    subject: '',
    htmlBody: '',
    senderName: '',
    senderEmail: '',
    scheduledAt: '',
  })
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [preview, setPreview] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/email/campaigns').then((r) => r.json()),
      fetch('/api/admin/groups').then((r) => r.json()),
      fetch('/api/admin/email/templates').then((r) => r.json()),
      fetch('/api/admin/email/signatures').then((r) => r.json()),
    ]).then(([cams, gs, ts, sigs]) => {
      setCampaigns(cams)
      setGroups(gs)
      setTemplates(ts)
      setSignatures(sigs)
      setLoading(false)
    })
  }, [])

  function loadTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId)
    if (t) {
      setSelectedTemplate(t)
      setForm({ ...form, templateId, subject: t.subject, htmlBody: t.htmlBody })
      updatePreview(t.htmlBody, t.subject)
    }
  }

  function updatePreview(html: string, subj?: string) {
    const group = groups.find((g) => g.id === form.groupId)
    const p = substituteTokens(html, {
      firstName: 'Jane',
      surname: 'Smith',
      email: 'jane@example.com',
      company: 'Acme Ltd',
      groupName: group?.name || '{GroupName}',
      senderName: form.senderName || '{SenderName}',
      unsubscribeLink: '#unsubscribe',
    })
    setPreview(p)
  }

  async function createCampaign() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          groupId: form.groupId || null,
          scheduledAt: form.scheduledAt || null,
        }),
      })
      if (res.ok) {
        const c = await res.json()
        setCampaigns([c, ...campaigns])
        setShowComposer(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendNow(campaignId: string) {
    if (!confirm('Send this campaign now?')) return
    setSending(campaignId)
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setCampaigns(campaigns.map((c) => c.id === campaignId ? { ...c, status: 'sent' } : c))
        alert(`Sent to ${data.sent}/${data.total} recipients`)
      } else {
        alert('Send failed: ' + data.error)
      }
    } finally {
      setSending(null)
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-amber-100 text-amber-700',
    sent: 'bg-green-100 text-green-700',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <a href="/admin/email" className="text-gray-500 hover:text-gray-700 text-sm">Email</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowComposer(!showComposer)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          {showComposer ? 'Close Composer' : 'New Campaign'}
        </button>
      </div>

      {showComposer && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Compose Campaign</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Audience</label>
                <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All members (no group filter)</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select value={form.templateId} onChange={(e) => loadTemplate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select template (or write below)</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                <select value={form.signatureId} onChange={(e) => setForm({ ...form, signatureId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">No signature</option>
                  {signatures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                  <input type="text" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                  <input type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea
                value={form.htmlBody}
                onChange={(e) => { setForm({ ...form, htmlBody: e.target.value }); updatePreview(e.target.value) }}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="HTML body..."
              />
              <div className="flex gap-2">
                <button onClick={createCampaign} disabled={saving || !form.subject || !form.htmlBody || !form.senderEmail} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Campaign'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview (test contact: Jane Smith)</label>
              {preview ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-white text-sm" dangerouslySetInnerHTML={{ __html: preview }} />
              ) : (
                <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Select a template or write HTML to see preview</div>
              )}
            </div>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Subject</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Group</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Sender</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No campaigns yet</td></tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.group?.name || 'All'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.senderName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.sentAt ? format(new Date(c.sentAt), 'dd MMM yyyy HH:mm') : c.scheduledAt ? `Scheduled ${format(new Date(c.scheduledAt), 'dd MMM HH:mm')}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => sendNow(c.id)}
                          disabled={sending === c.id}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {sending === c.id ? 'Sending...' : 'Send Now'}
                        </button>
                      )}
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
