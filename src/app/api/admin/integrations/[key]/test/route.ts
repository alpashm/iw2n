import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.integrationSetting.findUnique({ where: { key: params.key } })
  if (!setting) return NextResponse.json({ success: false, error: 'Not configured' })

  let value: string
  try {
    value = decrypt(setting.valueEncrypted)
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to decrypt credential' })
  }

  let success = false
  let error = ''

  try {
    switch (params.key) {
      case 'smtp2go_api_key': {
        // Test SMTP2GO by calling account info
        const res = await fetch('https://api.smtp2go.com/v3/stats/email_summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: value }),
        })
        success = res.ok
        if (!success) error = `HTTP ${res.status}`
        break
      }
      case 'claude_api_key': {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': value, 'anthropic-version': '2023-06-01' },
        })
        success = res.ok
        if (!success) error = `HTTP ${res.status}`
        break
      }
      case 'openai_api_key': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${value}` },
        })
        success = res.ok
        if (!success) error = `HTTP ${res.status}`
        break
      }
      case 'eventbrite_token': {
        const res = await fetch('https://www.eventbriteapi.com/v3/users/me/', {
          headers: { Authorization: `Bearer ${value}` },
        })
        success = res.ok
        if (!success) error = `HTTP ${res.status}`
        break
      }
      case 'keap_pat': {
        const res = await fetch('https://api.infusionsoft.com/crm/rest/v2/account/profile', {
          headers: { Authorization: `Bearer ${value}` },
        })
        success = res.ok
        if (!success) error = `HTTP ${res.status}`
        break
      }
      default:
        success = true // For OAuth tokens, just validate they exist
    }
  } catch (e: any) {
    error = e.message
  }

  await prisma.integrationSetting.update({
    where: { key: params.key },
    data: {
      lastTestedAt: new Date(),
      status: success ? 'connected' : 'error',
    },
  })

  return NextResponse.json({ success, error: error || undefined })
}
