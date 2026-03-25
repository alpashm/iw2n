'use client'

import { useState, useEffect } from 'react'

interface Integration {
  key: string
  label: string
  description: string
  fields: { key: string; label: string; placeholder: string; type?: string }[]
  supportsReadOnly: boolean
}

const INTEGRATIONS: Integration[] = [
  {
    key: 'smtp2go',
    label: 'SMTP2GO',
    description: 'Email delivery service for all outbound emails.',
    fields: [{ key: 'smtp2go_api_key', label: 'API Key', placeholder: 'Enter SMTP2GO API key' }],
    supportsReadOnly: false,
  },
  {
    key: 'xero',
    label: 'Xero',
    description: 'Accounting integration for invoicing and contact management.',
    fields: [
      { key: 'xero_client_id', label: 'Client ID', placeholder: 'Xero OAuth Client ID' },
      { key: 'xero_client_secret', label: 'Client Secret', placeholder: 'Xero OAuth Client Secret', type: 'password' },
    ],
    supportsReadOnly: true,
  },
  {
    key: 'eventbrite',
    label: 'Eventbrite',
    description: 'Event ticketing platform. EMS reads attendees and events.',
    fields: [{ key: 'eventbrite_token', label: 'Private Token', placeholder: 'Eventbrite private API token', type: 'password' }],
    supportsReadOnly: true,
  },
  {
    key: 'graph',
    label: 'Microsoft Graph API',
    description: 'Microsoft 365 inbox integration for AI ticketing.',
    fields: [
      { key: 'graph_client_id', label: 'Client ID', placeholder: 'Azure App Registration Client ID' },
      { key: 'graph_client_secret', label: 'Client Secret', placeholder: 'Azure App Registration Client Secret', type: 'password' },
      { key: 'graph_mailbox', label: 'Mailbox', placeholder: 'mailbox@domain.com' },
    ],
    supportsReadOnly: true,
  },
  {
    key: 'claude',
    label: 'Claude API',
    description: 'Anthropic Claude — primary AI model for drafting and automation.',
    fields: [{ key: 'claude_api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' }],
    supportsReadOnly: false,
  },
  {
    key: 'openai',
    label: 'OpenAI API',
    description: 'OpenAI GPT-4o — fallback AI model.',
    fields: [{ key: 'openai_api_key', label: 'API Key', placeholder: 'sk-...', type: 'password' }],
    supportsReadOnly: false,
  },
]

interface SettingData {
  key: string
  valueEncrypted: string
  readOnly: boolean
  lastTestedAt: string | null
  status: string
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connected: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    unconfigured: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.unconfigured}`}>
      {status}
    </span>
  )
}

function IntegrationCard({ integration, settings }: { integration: Integration; settings: Record<string, SettingData> }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [readOnly, setReadOnly] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  const primaryKey = integration.fields[0].key
  const primarySetting = settings[primaryKey]

  useEffect(() => {
    if (primarySetting) {
      setReadOnly(primarySetting.readOnly)
    }
  }, [primarySetting])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const field of integration.fields) {
        if (values[field.key] !== undefined) {
          await fetch('/api/admin/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: field.key, value: values[field.key], readOnly }),
          })
        }
      }
      // Save readOnly for primary key
      await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: primaryKey, readOnly }),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch(`/api/admin/integrations/${primaryKey}/test`, { method: 'POST' })
      const data = await res.json()
      alert(data.success ? 'Connection successful!' : `Connection failed: ${data.error}`)
    } finally {
      setTesting(false)
    }
  }

  const handleViewLogs = async () => {
    setShowLogs(!showLogs)
    if (!showLogs) {
      const res = await fetch(`/api/admin/integrations/${primaryKey}/logs`)
      const data = await res.json()
      setLogs(data)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{integration.label}</h3>
          <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
        </div>
        <StatusBadge status={primarySetting?.status ?? 'unconfigured'} />
      </div>

      <div className="space-y-3 mb-4">
        {integration.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              type={field.type ?? 'text'}
              placeholder={primarySetting?.valueEncrypted ? '••••••••' : field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {integration.supportsReadOnly && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id={`readonly-${integration.key}`}
            checked={readOnly}
            onChange={e => setReadOnly(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor={`readonly-${integration.key}`} className="text-sm text-gray-700">
            Read-only (block all write operations)
          </label>
        </div>
      )}

      {primarySetting?.lastTestedAt && (
        <p className="text-xs text-gray-400 mb-3">
          Last tested: {new Date(primarySetting.lastTestedAt).toLocaleString()}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleViewLogs}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
        >
          {showLogs ? 'Hide Logs' : 'View Sync Logs'}
        </button>
      </div>

      {showLogs && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sync Logs</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-gray-400">No logs found.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="text-xs bg-gray-50 rounded p-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.direction} — {log.records} records</span>
                    <span className="text-gray-400">{new Date(log.syncedAt).toLocaleString()}</span>
                  </div>
                  {log.errors && <p className="text-red-500 mt-1">{log.errors}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, SettingData>>({})

  useEffect(() => {
    fetch('/api/admin/integrations')
      .then(r => r.json())
      .then((data: SettingData[]) => {
        const map: Record<string, SettingData> = {}
        for (const s of data) map[s.key] = s
        setSettings(map)
      })
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Configure API credentials for all external services. Credentials are stored AES-256 encrypted.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard key={integration.key} integration={integration} settings={settings} />
        ))}
      </div>
    </div>
  )
}
