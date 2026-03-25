import { IntegrationService } from './base'

export class GraphService extends IntegrationService {
  protected integrationKey = 'graph'
  private baseUrl = 'https://graph.microsoft.com/v1.0'
  private accessToken: string
  private mailbox: string

  constructor(accessToken: string, mailbox: string, readOnly = false) {
    super()
    this.accessToken = accessToken
    this.mailbox = mailbox
    this.readOnly = readOnly
  }

  private headers() {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }
  }

  async getUnreadMessages(top = 20) {
    const response = await fetch(
      `${this.baseUrl}/users/${this.mailbox}/mailFolders/Inbox/messages?$filter=isRead eq false&$top=${top}`,
      { headers: this.headers() }
    )
    if (!response.ok) throw new Error(`Graph API error: ${response.status}`)
    return response.json()
  }

  async moveToDeletedItems(messageId: string) {
    this.assertWritable()
    const response = await fetch(
      `${this.baseUrl}/users/${this.mailbox}/messages/${messageId}/move`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ destinationId: 'deleteditems' }),
      }
    )
    if (!response.ok) throw new Error(`Graph API error: ${response.status}`)
    return response.json()
  }

  async sendMail(mailData: object) {
    this.assertWritable()
    const response = await fetch(`${this.baseUrl}/users/${this.mailbox}/sendMail`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(mailData),
    })
    if (!response.ok) throw new Error(`Graph API error: ${response.status}`)
  }
}
