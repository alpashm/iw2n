import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { ClaudeService } from '@/lib/integrations/claude'
import { format } from 'date-fns'

export interface AttendeeRow {
  name: string
  company: string
  role: string
  website: string
  isVisitor: boolean
}

export async function generateAttendanceSheetPdf(eventId: string): Promise<Buffer> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { group: true },
  })

  if (!event) throw new Error(`Event ${eventId} not found`)

  // 1. Fetch all active group members
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: event.groupId, status: 'active' },
    include: { user: true },
  })
  const memberEmails = new Set(memberships.map((m: { user: { email: string; firstName: string; lastName: string } }) => m.user.email.toLowerCase()))

  // 2. Fetch Eventbrite attendees fresh
  const eventbriteAttendees = await prisma.attendee.findMany({
    where: { eventId: event.id },
  })

  // 3. Categorize
  const members: AttendeeRow[] = memberships
    .map((m: { user: { firstName: string; lastName: string; email: string } }) => ({
      name: `${m.user.firstName} ${m.user.lastName}`,
      company: '',
      role: '',
      website: '',
      isVisitor: false,
    }))
    .sort((a: AttendeeRow, b: AttendeeRow) => a.name.localeCompare(b.name))

  const visitors: AttendeeRow[] = eventbriteAttendees
    .filter((a: { email: string; name: string }) => !memberEmails.has(a.email.toLowerCase()))
    .map((a: { email: string; name: string }) => ({
      name: a.name,
      company: '',
      role: '',
      website: '',
      isVisitor: true,
    }))
    .sort((a: AttendeeRow, b: AttendeeRow) => a.name.localeCompare(b.name))

  // 4. Generate AI welcome note
  let welcomeNote = ''
  try {
    const claudeSetting = await prisma.integrationSetting.findUnique({
      where: { key: 'claude_api_key' },
    })
    if (claudeSetting) {
      const apiKey = decrypt(claudeSetting.valueEncrypted)
      const claude = new ClaudeService(apiKey)
      const dateStr = format(event.startDatetime, 'EEEE d MMMM yyyy')
      welcomeNote = await claude.generateDraft(
        'You are writing a brief welcome note for a business networking event attendance sheet.',
        `Write a 2-sentence welcoming introduction for the ${event.group.name} networking event on ${dateStr}. Keep it warm and professional.`
      )
    }
  } catch {
    // AI welcome note is optional
  }

  // 5. Build HTML
  const dateFormatted = format(event.startDatetime, 'EEEE d MMMM yyyy')
  const timeFormatted = format(event.startDatetime, 'HH:mm')

  const html = buildAttendanceSheetHtml({
    event,
    groupName: event.group.name,
    dateFormatted,
    timeFormatted,
    members,
    visitors,
    welcomeNote,
  })

  // 6. Generate PDF with Puppeteer
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function buildAttendanceSheetHtml(data: {
  event: { title: string; location: string | null }
  groupName: string
  dateFormatted: string
  timeFormatted: string
  members: AttendeeRow[]
  visitors: AttendeeRow[]
  welcomeNote: string
}): string {
  const tableRows = (rows: AttendeeRow[]) =>
    rows
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.company)}</td>
        <td>${escapeHtml(r.role)}</td>
        <td>${escapeHtml(r.website)}</td>
        <td class="notes-col"></td>
      </tr>
    `
      )
      .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px; }
    .logo-placeholder { width: 120px; height: 50px; background: #f3f4f6; border: 1px solid #d1d5db; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; margin-bottom: 10px; }
    h1 { margin: 5px 0; font-size: 18px; }
    .event-meta { color: #4b5563; font-size: 11px; }
    .welcome-note { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 10px 15px; margin: 15px 0; font-style: italic; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e3a5f; color: white; padding: 8px; text-align: left; font-size: 10px; }
    td { border: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }
    .notes-col { min-width: 120px; }
    .section-header { background: #f3f4f6; font-weight: bold; padding: 8px; margin: 15px 0 5px; font-size: 12px; border-left: 4px solid #3b82f6; }
    .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; }
    @media print { .footer { position: fixed; bottom: 0; left: 0; right: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-placeholder">IW2N LOGO</div>
    <h1>${escapeHtml(data.event.title)}</h1>
    <div class="event-meta">
      ${escapeHtml(data.dateFormatted)} &bull; ${escapeHtml(data.timeFormatted)}
      ${data.event.location ? ` &bull; ${escapeHtml(data.event.location)}` : ''}
      &bull; ${escapeHtml(data.groupName)}
    </div>
  </div>

  ${data.welcomeNote ? `<div class="welcome-note">${escapeHtml(data.welcomeNote)}</div>` : ''}

  <div class="section-header">Group Members (${data.members.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:20%">Name</th>
        <th style="width:20%">Company</th>
        <th style="width:18%">Role / Industry</th>
        <th style="width:18%">Website</th>
        <th style="width:24%">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows(data.members)}
      ${data.members.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">No members listed</td></tr>' : ''}
    </tbody>
  </table>

  ${
    data.visitors.length > 0
      ? `
  <div class="section-header">Visitors (${data.visitors.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:20%">Name</th>
        <th style="width:20%">Company</th>
        <th style="width:18%">Role / Industry</th>
        <th style="width:18%">Website</th>
        <th style="width:24%">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows(data.visitors)}
    </tbody>
  </table>`
      : ''
  }

  <div class="footer">
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
    <span>IWant2Network &bull; Confidential</span>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
