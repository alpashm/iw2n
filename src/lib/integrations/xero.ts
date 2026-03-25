import { IntegrationService } from './base'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

export interface XeroContact {
  ContactID: string
  Name: string
  EmailAddress?: string
  Phones?: Array<{ PhoneType: string; PhoneNumber: string }>
  ContactGroups?: Array<{ Name: string }>
  IsSupplier?: boolean
  IsCustomer?: boolean
}

export interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  Type: string
  Status: string
  Total: number
  AmountDue: number
  DueDate?: string
  DateString?: string
  Contact?: XeroContact
}

export class XeroService extends IntegrationService {
  protected integrationKey = 'xero'
  private baseUrl = 'https://api.xero.com/api.xro/2.0'
  private accessToken: string
  private tenantId: string

  constructor(accessToken: string, tenantId: string, readOnly = false) {
    super()
    this.accessToken = accessToken
    this.tenantId = tenantId
    this.readOnly = readOnly
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Xero-tenant-id': this.tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  async getContacts(searchTerm?: string): Promise<{ Contacts: XeroContact[] }> {
    let url = `${this.baseUrl}/Contacts?summaryOnly=false`
    if (searchTerm) {
      url += `&searchTerm=${encodeURIComponent(searchTerm)}`
    }
    const response = await fetch(url, { headers: this.headers() })
    if (!response.ok) throw new Error(`Xero API error: ${response.status}`)
    return response.json()
  }

  async getContactByEmail(email: string): Promise<{ Contacts: XeroContact[] }> {
    const response = await fetch(
      `${this.baseUrl}/Contacts?where=EmailAddress%3D%22${encodeURIComponent(email)}%22`,
      { headers: this.headers() }
    )
    if (!response.ok) throw new Error(`Xero API error: ${response.status}`)
    return response.json()
  }

  async getContactById(xeroContactId: string): Promise<{ Contacts: XeroContact[] }> {
    const response = await fetch(`${this.baseUrl}/Contacts/${xeroContactId}`, {
      headers: this.headers(),
    })
    if (!response.ok) throw new Error(`Xero API error: ${response.status}`)
    return response.json()
  }

  async getInvoices(xeroContactId: string): Promise<{ Invoices: XeroInvoice[] }> {
    const response = await fetch(`${this.baseUrl}/Invoices?ContactIDs=${xeroContactId}`, {
      headers: this.headers(),
    })
    if (!response.ok) throw new Error(`Xero API error: ${response.status}`)
    return response.json()
  }

  async createDraftInvoice(invoiceData: object) {
    this.assertWritable()
    const response = await fetch(`${this.baseUrl}/Invoices`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(invoiceData),
    })
    if (!response.ok) throw new Error(`Xero API error: ${response.status}`)
    return response.json()
  }

  async getTenants(): Promise<Array<{ tenantId: string; tenantName: string; tenantType: string }>> {
    const response = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) throw new Error(`Xero connections error: ${response.status}`)
    return response.json()
  }

  static getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'accounting.contacts accounting.transactions offline_access',
      state,
    })
    return `https://login.xero.com/identity/connect/authorize?${params}`
  }

  static async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!response.ok) throw new Error(`Xero token exchange error: ${response.status}`)
    return response.json()
  }

  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    if (!response.ok) throw new Error(`Xero token refresh error: ${response.status}`)
    return response.json()
  }
}

export async function getXeroService(): Promise<XeroService | null> {
  try {
    const settings = await prisma.integrationSetting.findMany({
      where: { key: { in: ['xero_access_token', 'xero_tenant_id', 'xero_read_only'] } },
    })
    const getVal = (k: string) => {
      const s = settings.find((x: { key: string; valueEncrypted: string }) => x.key === k)
      return s ? decrypt(s.valueEncrypted) : null
    }
    const accessToken = getVal('xero_access_token')
    const tenantId = getVal('xero_tenant_id')
    if (!accessToken || !tenantId) return null
    const readOnly = getVal('xero_read_only') === 'true'
    return new XeroService(accessToken, tenantId, readOnly)
  } catch {
    return null
  }
}
