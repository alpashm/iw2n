import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { XeroService } from '@/lib/integrations/xero'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=xero_auth_failed`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=xero_no_code`
    )
  }

  try {
    // Get credentials
    const settings = await prisma.integrationSetting.findMany({
      where: { key: { in: ['xero_client_id', 'xero_client_secret'] } },
    })

    const clientId = settings.find((s: { key: string; valueEncrypted: string }) => s.key === 'xero_client_id')
    const clientSecret = settings.find((s: { key: string; valueEncrypted: string }) => s.key === 'xero_client_secret')

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=xero_not_configured`
      )
    }

    const id = decrypt(clientId.valueEncrypted)
    const secret = decrypt(clientSecret.valueEncrypted)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/xero/callback`

    const tokens = await XeroService.exchangeCodeForTokens(code, id, secret, redirectUri)

    // Store tokens
    await prisma.integrationSetting.upsert({
      where: { key: 'xero_access_token' },
      update: { valueEncrypted: encrypt(tokens.access_token), status: 'connected' },
      create: { key: 'xero_access_token', valueEncrypted: encrypt(tokens.access_token), status: 'connected' },
    })

    await prisma.integrationSetting.upsert({
      where: { key: 'xero_refresh_token' },
      update: { valueEncrypted: encrypt(tokens.refresh_token), status: 'connected' },
      create: { key: 'xero_refresh_token', valueEncrypted: encrypt(tokens.refresh_token), status: 'connected' },
    })

    // Get tenant ID
    const xero = new XeroService(tokens.access_token, '', false)
    const tenants = await xero.getTenants()
    if (tenants.length > 0) {
      await prisma.integrationSetting.upsert({
        where: { key: 'xero_tenant_id' },
        update: { valueEncrypted: encrypt(tenants[0].tenantId), status: 'connected' },
        create: { key: 'xero_tenant_id', valueEncrypted: encrypt(tenants[0].tenantId), status: 'connected' },
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?success=xero_connected`
    )
  } catch (err) {
    console.error('Xero OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=xero_token_exchange_failed`
    )
  }
}
