import { IntegrationService } from './base'

export interface SendEmailOptions {
  sender: string
  to: string[]
  subject: string
  html_body: string
  text_body?: string
  attachments?: Array<{ filename: string; fileblob: string; mimetype: string }>
}

export class Smtp2goService extends IntegrationService {
  protected integrationKey = 'smtp2go'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    this.apiKey = apiKey
  }

  async sendEmail(options: SendEmailOptions): Promise<{ request_id: string }> {
    const batches: string[][] = []
    for (let i = 0; i < options.to.length; i += 100) {
      batches.push(options.to.slice(i, i + 100))
    }

    let lastResult: { request_id: string } = { request_id: '' }
    for (const batch of batches) {
      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smtp2go-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ ...options, to: batch }),
      })
      if (!response.ok) {
        const err = await response.text()
        throw new Error(`SMTP2GO error: ${err}`)
      }
      lastResult = await response.json()
    }
    return lastResult
  }
}
