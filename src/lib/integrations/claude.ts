import { IntegrationService } from './base'
import Anthropic from '@anthropic-ai/sdk'

export class ClaudeService extends IntegrationService {
  protected integrationKey = 'claude'
  private client: Anthropic

  constructor(apiKey: string) {
    super()
    this.client = new Anthropic({ apiKey })
  }

  async generateDraft(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
    return content.text
  }
}
