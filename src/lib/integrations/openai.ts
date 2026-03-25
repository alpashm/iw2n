import { IntegrationService } from './base'
import OpenAI from 'openai'

export class OpenAIService extends IntegrationService {
  protected integrationKey = 'openai'
  private client: OpenAI

  constructor(apiKey: string) {
    super()
    this.client = new OpenAI({ apiKey })
  }

  async generateDraft(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })
    return response.choices[0]?.message?.content ?? ''
  }
}
