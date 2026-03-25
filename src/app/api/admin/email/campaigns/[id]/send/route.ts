import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { Smtp2goService } from '@/lib/integrations/smtp2go'
import { substituteTokens } from '@/lib/email/tokens'
import { appendSignature } from '@/lib/email/templates'
import { generateUnsubscribeToken, buildUnsubscribeLink } from '@/lib/email/tokens'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: params.id },
      include: { group: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
    }

    // Get SMTP key
    const smtpSetting = await prisma.integrationSetting.findUnique({
      where: { key: 'smtp2go_api_key' },
    })
    if (!smtpSetting) {
      return NextResponse.json({ error: 'SMTP2GO not configured' }, { status: 400 })
    }

    const smtp = new Smtp2goService(decrypt(smtpSetting.valueEncrypted))

    // Get signature if set
    let signatureHtml = ''
    if (campaign.signatureId) {
      const sig = await prisma.emailSignature.findUnique({ where: { id: campaign.signatureId } })
      if (sig) signatureHtml = sig.htmlContent
    }

    // Get recipients
    let recipients: Array<{ userId: string; email: string; firstName: string; lastName: string }> = []

    if (campaign.groupId) {
      const memberships = await prisma.groupMembership.findMany({
        where: {
          groupId: campaign.groupId,
          status: 'active',
          unsubscribedAt: null,
        },
        include: { user: true },
      })
      // Filter out suppressed emails
      const suppressedEmails = await prisma.emailLog.findMany({
        where: { status: 'bounced' },
        select: { email: true },
      })
      const suppressedSet = new Set(suppressedEmails.map((e: { email: string }) => e.email.toLowerCase()))

      recipients = memberships
        .filter((m: { user: { email: string } }) => !suppressedSet.has(m.user.email.toLowerCase()))
        .map((m: { user: { id: string; email: string; firstName: string; lastName: string } }) => ({
          userId: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
        }))
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let sentCount = 0

    // Send in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)

      for (const recipient of batch) {
        try {
          const unsubToken = generateUnsubscribeToken(recipient.userId, campaign.groupId || '')
          const unsubLink = buildUnsubscribeLink(baseUrl, campaign.groupId || '', recipient.userId, unsubToken)

          const html = substituteTokens(campaign.htmlBody, {
            firstName: recipient.firstName,
            surname: recipient.lastName,
            email: recipient.email,
            groupName: campaign.group?.name,
            senderName: campaign.senderName,
            unsubscribeLink: unsubLink,
          })

          const finalHtml = signatureHtml ? appendSignature(html, signatureHtml) : html

          const result = await smtp.sendEmail({
            sender: `${campaign.senderName} <${campaign.senderEmail}>`,
            to: [recipient.email],
            subject: campaign.subject,
            html_body: finalHtml,
          })

          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              userId: recipient.userId,
              email: recipient.email,
              type: 'campaign',
              smtp2goEmailId: result.request_id,
              status: 'sent',
              sentAt: new Date(),
            },
          })
          sentCount++
        } catch (sendErr) {
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              userId: recipient.userId,
              email: recipient.email,
              type: 'campaign',
              status: 'failed',
            },
          })
        }
      }
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'sent', sentAt: new Date() },
    })

    return NextResponse.json({ success: true, sent: sentCount, total: recipients.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Send failed' },
      { status: 500 }
    )
  }
}
