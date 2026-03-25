import { Worker, Job } from 'bullmq'
import { getRedisConnection, getAttendanceSheetQueue } from './queue'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { generateAttendanceSheetPdf } from '@/lib/pdf/attendanceSheet'
import { Smtp2goService } from '@/lib/integrations/smtp2go'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

export async function triggerAttendanceSheetCron(): Promise<void> {
  await getAttendanceSheetQueue().add('attendance-sheet-cron', {})
}

export async function runAttendanceSheetCron(): Promise<void> {
  const tomorrow = addDays(new Date(), 1)
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  // Find all in-person events tomorrow
  const events = await prisma.event.findMany({
    where: {
      type: 'in-person',
      status: 'published',
      startDatetime: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: { group: true },
  })

  if (events.length === 0) return

  const smtpSetting = await prisma.integrationSetting.findUnique({
    where: { key: 'smtp2go_api_key' },
  })
  if (!smtpSetting) return

  const smtpKey = decrypt(smtpSetting.valueEncrypted)
  const smtp = new Smtp2goService(smtpKey)

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  for (const event of events) {
    try {
      const pdfBuffer = await generateAttendanceSheetPdf(event.id)
      const pdfBase64 = pdfBuffer.toString('base64')
      const dateStr = format(event.startDatetime, 'yyyyMMdd')
      const filename = `${dateStr}-${event.group.slug}-AttendanceSheet.pdf`

      await smtp.sendEmail({
        sender: 'IWant2Network EMS <noreply@iwant2network.com>',
        to: [adminEmail],
        subject: `Attendance Sheet: ${event.title} - ${format(event.startDatetime, 'dd MMM yyyy')}`,
        html_body: `
          <div style="font-family: sans-serif;">
            <h2>Attendance Sheet Ready</h2>
            <p>The attendance sheet for tomorrow's event is attached.</p>
            <p><strong>Event:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${format(event.startDatetime, 'EEEE d MMMM yyyy')}</p>
            <p><strong>Time:</strong> ${format(event.startDatetime, 'HH:mm')}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
            <p><strong>Group:</strong> ${event.group.name}</p>
            <p>You can also download the sheet directly from the event page in EMS.</p>
          </div>
        `,
        attachments: [
          {
            filename,
            fileblob: pdfBase64,
            mimetype: 'application/pdf',
          },
        ],
      })
    } catch (err) {
      console.error(`Failed to generate attendance sheet for event ${event.id}:`, err)
    }
  }
}

export function startAttendanceSheetWorker() {
  const worker = new Worker(
    'attendance-sheet',
    async (job: Job) => {
      console.log('Running attendance sheet cron:', job.id)
      await runAttendanceSheetCron()
    },
    { connection: getRedisConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error('Attendance sheet cron failed:', job?.id, err)
  })

  return worker
}
