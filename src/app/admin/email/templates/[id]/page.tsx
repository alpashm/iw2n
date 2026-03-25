'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'

interface Template {
  id: string
  name: string
  category: string
  subject: string
  htmlBody: string
}

const TOKEN_LIST = [
  '{FirstName}', '{Surname}', '{FullName}', '{Email}', '{Company}',
  '{GroupName}', '{EventTitle}', '{EventDate}', '{EventTime}', '{EventLocation}', '{EventLink}',
  '{IntroPersonAName}', '{IntroPersonBName}', '{IntroPersonACompany}', '{IntroPersonBCompany}',
  '{IntroEventTitle}', '{IntroEventDate}', '{PackageName}', '{PackagePrice}', '{PackageExpiry}',
  '{UnsubscribeLink}', '{CurrentDate}', '{SenderName}',
]

export default function TemplateEditorPage() {
  const { id } = useParams()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [rawHtml, setRawHtml] = useState('')
  const [subject, setSubject] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('transactional')
  const [saved, setSaved] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none min-h-64 p-4 focus:outline-none',
      },
    },
  })

  useEffect(() => {
    fetch(`/api/admin/email/templates/${id}`)
      .then((r) => r.json())
      .then((t) => {
        setTemplate(t)
        setName(t.name)
        setSubject(t.subject)
        setCategory(t.category)
        setRawHtml(t.htmlBody)
        editor?.commands.setContent(t.htmlBody)
      })
      .finally(() => setLoading(false))
  }, [id, editor])

  async function save() {
    setSaving(true)
    const htmlBody = rawMode ? rawHtml : (editor?.getHTML() || '')
    try {
      await fetch(`/api/admin/email/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, category, htmlBody }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function insertToken(token: string) {
    if (rawMode) {
      setRawHtml(rawHtml + token)
    } else {
      editor?.commands.insertContent(token)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!template) return <div className="text-center py-12 text-red-500">Template not found</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/email/templates" className="text-gray-500 hover:text-gray-700 text-sm">Templates</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-4">
          {/* Meta fields */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Template Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="transactional">Transactional</option>
                  <option value="bulk">Bulk</option>
                  <option value="referral">Referral</option>
                  <option value="reminder">Reminder</option>
                  <option value="welcome">Welcome</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject Line</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Use {FirstName} etc." />
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 flex-wrap">
              {!rawMode && editor && (
                <>
                  <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>B</button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm italic ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>I</button>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>H1</button>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded text-sm font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>H2</button>
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>• List</button>
                  <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className="px-2 py-1 rounded text-sm hover:bg-gray-100">Left</button>
                  <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className="px-2 py-1 rounded text-sm hover:bg-gray-100">Center</button>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!rawMode) {
                      setRawHtml(editor?.getHTML() || '')
                    } else {
                      editor?.commands.setContent(rawHtml)
                    }
                    setRawMode(!rawMode)
                  }}
                  className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50"
                >
                  {rawMode ? 'Visual Editor' : 'HTML Source'}
                </button>
              </div>
            </div>

            {rawMode ? (
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                className="w-full min-h-96 p-4 font-mono text-xs text-gray-800 focus:outline-none resize-y"
                placeholder="Enter HTML..."
              />
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Tokens Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-fit">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Token Reference</h3>
          <p className="text-xs text-gray-500 mb-3">Click to insert into editor</p>
          <div className="space-y-1">
            {TOKEN_LIST.map((token) => (
              <button
                key={token}
                onClick={() => insertToken(token)}
                className="block w-full text-left text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 px-2 py-1.5 rounded font-mono transition-colors"
              >
                {token}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
