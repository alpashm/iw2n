import { Worker, Job } from 'bullmq'
import { getRedisConnection, eventbriteSyncQueue } from './queue'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { EventbriteService } from '@/lib/integrations/eventbrite'
import { Smtp2goService } from '@/lib/integrations/smtp2go'
import { createEventIcs } from '@/lib/calendar/ical'

export async function triggerEventbriteSync(): Promise<void> {
  await eventbriteSyncQueue.add('eventbrite-sync', {}, { jobId: `eb-sync-${Date.now()}` })
}

export async function runEventbriteSync(): Promise<{ attendees: number; errors: string[] }> {
  const errors: string[] = []
  let attendeesProcessed = 0

  const tokenSetting = await prisma.integrationSetting.findUnique({
    where: { key: 'eventbrite_token' },
  })
  if (!tokenSetting) throw new Error('Eventbrite token not configured')

  const token = decrypt(tokenSetting.valueEncrypted)
  const eventbrite = new EventbriteService(token, tokenSetting.readOnly)

  // Get all published events in EMS with an Eventbrite ID
  const emsEvents = await prisma.event.findMany({
    where: {
      eventbriteEventId: { not: null },
      status: { in: ['published', 'completed'] },
    },
    include: { group: true },
  })

  for (const emsEvent of emsEvents) {
    try {
      const ebData = await eventbrite.getAttendees(emsEvent.eventbriteEventId!)
      const ebAttendees = ebData.attendees || []

      for (const ebAttendee of ebAttendees) {
        const orderId = ebAttendee.order_id ? String(ebAttendee.order_id) : null
        if (!orderId) continue

        const profile = ebAttendee.profile || {}
        const email = profile.email || ''
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

        // Check if already exists
        const existing = await prisma.attendee.findUnique({
          where: { eventbriteOrderId: orderId },
        })

        if (!existing) {
          // New attendee - create record
          const attendee = await prisma.attendee.create({
            data: {
              eventId: emsEvent.id,
              name,
              email,
              ticketType: ebAttendee.ticket_class_name || null,
              eventbriteOrderId: orderId,
              registeredAt: ebAttendee.created
                ? new Date(ebAttendee.created)
                : new Date(),
            },
          })
          attendeesProcessed++

          // Send .ics invite if email exists and not yet sent
          if (email && !attendee.icsSent) {
            try {
              await sendIcsInvite(attendee.id, emsEvent, email, name)
            } catch (icsErr) {
              errors.push(
                `ICS send for attendee ${attendee.id}: ${icsErr instanceof Error ? icsErr.message : 'unknown'}`
              )
            }
          }
        } else {
          // Update existing attendee
          await prisma.attendee.update({
            where: { id: existing.id },
            data: {
              name,
              email,
              ticketType: ebAttendee.ticket_class_name || null,
            },
          })
        }
      }
    } catch (err) {
      errors.push(
        `Event ${emsEvent.id}: ${err instanceof Error ? err.message : 'unknown error'}`
      )
    }
  }

  await prisma.syncLog.create({
    data: {
      source: 'eventbrite',
      direction: 'pull',
      records: attendeesProcessed,
      errors: errors.length > 0 ? errors.join('; ') : null,
    },
  })

  return { attendees: attendeesProcessed, errors }
}

async function sendIcsInvite(
  attendeeId: string,
  event: {
    id: string
    title: string
    description: string | null
    startDatetime: Date
    endDatetime: Date
    timezone: string
    location: string | null
    onlineLink: string | null
    eventbriteUrl: string | null
  },
  email: string,
  name: string
): Promise<void> {
  const smtpSetting = await prisma.integrationSetting.findUnique({
    where: { key: 'smtp2go_api_key' },
  })
  if (!smtpSetting) return

  const smtpKey = decrypt(smtpSetting.valueEncrypted)
  const smtp = new Smtp2goService(smtpKey)

  const icsContent = createEventIcs(
    {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime,
      timezone: event.timezone,
      location: event.location || undefined,
      onlineLink: event.onlineLink || undefined,
      eventbriteUrl: event.eventbriteUrl || undefined,
    },
    { name, email, partstat: 'ACCEPTED' }
  )

  const icsBase64 = Buffer.from(icsContent).toString('base64')

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're registered for ${event.title}</h2>
      <p>Hi ${name},</p>
      <p>Thank you for registering for <strong>${event.title}</strong>.</p>
      <p><strong>Date:</strong> ${event.startDatetime.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}</p>
      <p><strong>Time:</strong> ${event.startDatetime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}</p>
      ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
      ${event.onlineLink ? `<p><strong>Online Link:</strong> <a href="${event.onlineLink}">${event.onlineLink}</a></p>` : ''}
      <p>A calendar invite is attached. We look forward to seeing you!</p>
      <p>Best regards,<br>IWant2Network Team</p>
    </div>
  `

  const result = await smtp.sendEmail({
    sender: 'IWant2Network <events@iwant2network.com>',
    to: [email],
    subject: `Calendar Invite: ${event.title}`,
    html_body: htmlBody,
    attachments: [
      {
        filename: 'event.ics',
        fileblob: icsBase64,
        mimetype: 'text/calendar',
      },
    ],
  })

  // Mark ICS as sent
  await prisma.attendee.update({
    where: { id: attendeeId },
    data: { icsSent: true },
  })

  // Log email
  await prisma.emailLog.create({
    data: {
      email,
      type: 'confirmation',
      smtp2goEmailId: result.request_id,
      status: 'sent',
    },
  })
}

export function startEventbriteSyncWorker() {
  const worker = new Worker(
    'eventbrite-sync',
    async (job: Job) => {
      console.log('Running Eventbrite sync job:', job.id)
      const result = await runEventbriteSync()
      console.log(
        `Eventbrite sync complete: ${result.attendees} attendees, ${result.errors.length} errors`
      )
      return result
    },
    { connection: getRedisConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error('Eventbrite sync job failed:', job?.id, err)
  })

  return worker
}
