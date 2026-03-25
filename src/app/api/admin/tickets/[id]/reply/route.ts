import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GraphService } from '@/lib/integrations/graph'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { replyHtml, subject } = await request.json()

    if (!replyHtml) {
      return NextResponse.json({ error: 'replyHtml is required' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Get Graph credentials
    const settings = await prisma.integrationSetting.findMany({
      where: { key: { in: ['graph_access_token', 'graph_mailbox'] } },
    })
    const getVal = (k: string) => {
      const s = settings.find((x: { key: string; valueEncrypted: string }) => x.key === k)
      return s ? decrypt(s.valueEncrypted) : null
    }

    const accessToken = getVal('graph_access_token')
    const mailbox = getVal('graph_mailbox')

    if (!accessToken || !mailbox) {
      return NextResponse.json({ error: 'Graph API not configured' }, { status: 400 })
    }

    const graph = new GraphService(accessToken, mailbox)

    // Send reply via Graph API
    const mailData = {
      message: {
        subject: subject || `Re: ${ticket.subject}`,
        body: {
          contentType: 'HTML',
          content: replyHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: ticket.fromEmail,
              name: ticket.fromName,
            },
          },
        ],
      },
      saveToSentItems: true,
    }

    await graph.sendMail(mailData)

    // Update ticket status
    await prisma.ticket.update({
      where: { id: params.id },
      data: { status: 'replied', repliedAt: new Date() },
    })

    // Log email
    await prisma.emailLog.create({
      data: {
        ticketId: ticket.id,
        email: ticket.fromEmail,
        type: 'ticket-reply',
        status: 'sent',
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reply failed' },
      { status: 500 }
    )
  }
}
