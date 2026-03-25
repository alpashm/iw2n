import { Worker, Job } from 'bullmq'
import { getRedisConnection, inboxPollQueue } from './queue'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GraphService } from '@/lib/integrations/graph'
import { ClaudeService } from '@/lib/integrations/claude'

export async function triggerInboxPoll(): Promise<void> {
  await inboxPollQueue.add('inbox-poll', {}, { jobId: `inbox-${Date.now()}` })
}

export async function runInboxPoll(): Promise<{ tickets: number; errors: string[] }> {
  const errors: string[] = []
  let ticketsCreated = 0

  try {
    const settings = await prisma.integrationSetting.findMany({
      where: {
        key: { in: ['graph_access_token', 'graph_mailbox', 'claude_api_key'] },
      },
    })

    const getVal = (k: string) => {
      const s = settings.find((x: { key: string; valueEncrypted: string }) => x.key === k)
      return s ? decrypt(s.valueEncrypted) : null
    }

    const accessToken = getVal('graph_access_token')
    const mailbox = getVal('graph_mailbox')
    if (!accessToken || !mailbox) {
      throw new Error('Graph API credentials not configured')
    }

    const graph = new GraphService(accessToken, mailbox)
    const messages = await graph.getUnreadMessages(20)
    const msgList = messages.value || []

    const claudeApiKey = getVal('claude_api_key')
    let claude: ClaudeService | null = null
    if (claudeApiKey) {
      claude = new ClaudeService(claudeApiKey)
    }

    for (const msg of msgList) {
      try {
        // Check if ticket already exists
        const existing = await prisma.ticket.findUnique({
          where: { graphMessageId: msg.id },
        })
        if (existing) continue

        const bodyHtml = msg.body?.content || ''
        const fromName = msg.from?.emailAddress?.name || ''
        const fromEmail = msg.from?.emailAddress?.address || ''
        const subject = msg.subject || '(No Subject)'
        const receivedAt = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date()

        // Create ticket
        const ticket = await prisma.ticket.create({
          data: {
            fromName,
            fromEmail,
            subject,
            bodyHtml,
            receivedAt,
            status: 'new',
            graphMessageId: msg.id,
          },
        })
        ticketsCreated++

        // Move to deleted items (process inbox)
        try {
          await graph.moveToDeletedItems(msg.id)
        } catch (moveErr) {
          errors.push(`Move message ${msg.id}: ${moveErr instanceof Error ? moveErr.message : 'error'}`)
        }

        // Generate AI draft
        if (claude) {
          try {
            const draft = await claude.generateDraft(
              "You are a friendly assistant for IWant2Network, a London business networking organisation run by Lizzy. Draft a warm, professional reply to this enquiry email. Keep it concise, helpful and on-brand.",
              `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${bodyHtml.replace(/<[^>]*>/g, '')}`
            )
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { status: 'ai-draft-ready', aiDraft: draft },
            })
          } catch (aiErr) {
            errors.push(`AI draft for ticket ${ticket.id}: ${aiErr instanceof Error ? aiErr.message : 'error'}`)
          }
        }
      } catch (err) {
        errors.push(`Message ${msg.id}: ${err instanceof Error ? err.message : 'error'}`)
      }
    }
  } catch (err) {
    errors.push(`Inbox poll failed: ${err instanceof Error ? err.message : 'error'}`)
  }

  return { tickets: ticketsCreated, errors }
}

export function startInboxPollWorker() {
  const worker = new Worker(
    'inbox-poll',
    async (job: Job) => {
      console.log('Running inbox poll job:', job.id)
      const result = await runInboxPoll()
      console.log(`Inbox poll complete: ${result.tickets} tickets, ${result.errors.length} errors`)
      return result
    },
    { connection: getRedisConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error('Inbox poll job failed:', job?.id, err)
  })

  return worker
}
