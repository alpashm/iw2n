import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=graph_auth_failed`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=graph_no_code`
    )
  }

  try {
    // Get Graph credentials
    const settings = await prisma.integrationSetting.findMany({
      where: { key: { in: ['graph_client_id', 'graph_client_secret', 'graph_tenant_id'] } },
    })

    const getVal = (k: string) => {
      const s = settings.find((x: { key: string; valueEncrypted: string }) => x.key === k)
      if (!s) return null
      try {
        const { decrypt } = require('@/lib/encryption')
        return decrypt(s.valueEncrypted)
      } catch {
        return null
      }
    }

    const clientId = getVal('graph_client_id')
    const clientSecret = getVal('graph_client_secret')
    const tenantId = getVal('graph_tenant_id') || 'common'

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=graph_not_configured`
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/graph/callback`

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
          scope:
            'Mail.ReadWrite Mail.Send offline_access Contacts.Read Mail.ReadWrite.Shared Mail.Send.Shared Contacts.Read.Shared',
        }),
      }
    )

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokens = await tokenResponse.json()

    await prisma.integrationSetting.upsert({
      where: { key: 'graph_access_token' },
      update: { valueEncrypted: encrypt(tokens.access_token), status: 'connected' },
      create: { key: 'graph_access_token', valueEncrypted: encrypt(tokens.access_token), status: 'connected' },
    })

    if (tokens.refresh_token) {
      await prisma.integrationSetting.upsert({
        where: { key: 'graph_refresh_token' },
        update: { valueEncrypted: encrypt(tokens.refresh_token), status: 'connected' },
        create: { key: 'graph_refresh_token', valueEncrypted: encrypt(tokens.refresh_token), status: 'connected' },
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?success=graph_connected`
    )
  } catch (err) {
    console.error('Graph OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=graph_token_exchange_failed`
    )
  }
}
