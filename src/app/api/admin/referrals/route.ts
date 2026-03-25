import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { Smtp2goService } from '@/lib/integrations/smtp2go'
import { substituteTokens } from '@/lib/email/tokens'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')

  try {
    const referrals = await prisma.referral.findMany({
      where: personId
        ? { OR: [{ personAId: personId }, { personBId: personId }] }
        : {},
      include: {
        personA: true,
        personB: true,
      },
      orderBy: { sentAt: 'desc' },
    })
    return NextResponse.json(referrals)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      personAId,
      personBId,
      eventbriteEventId,
      eventTitle,
      eventDate,
      templateId,
      personalNote,
    } = data

    if (!personAId || !personBId) {
      return NextResponse.json({ error: 'personAId and personBId are required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.referral.findFirst({
      where: {
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Duplicate referral', existingId: existing.id },
        { status: 409 }
      )
    }

    const personA = await prisma.user.findUnique({ where: { id: personAId } })
    const personB = await prisma.user.findUnique({ where: { id: personBId } })

    if (!personA || !personB) {
      return NextResponse.json({ error: 'One or both persons not found' }, { status: 404 })
    }

    // Get template and build email
    let htmlBody = ''
    let subject = `Introduction: ${personA.firstName} ${personA.lastName} & ${personB.firstName} ${personB.lastName}`

    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
      if (template) {
        const context = {
          firstName: personA.firstName,
          surname: personA.lastName,
          introPersonAName: personA.firstName,
          introPersonBName: personB.firstName,
          introPersonACompany: '',
          introPersonBCompany: '',
          introEventTitle: eventTitle || '',
          introEventDate: eventDate ? new Date(eventDate) : undefined,
        }
        htmlBody = substituteTokens(template.htmlBody, context)
        subject = substituteTokens(template.subject, context)
      }
    }

    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Introduction</h2>
          <p>We'd like to introduce <strong>${personA.firstName} ${personA.lastName}</strong> to <strong>${personB.firstName} ${personB.lastName}</strong>.</p>
          ${personalNote ? `<p>${personalNote}</p>` : ''}
          ${eventTitle ? `<p>You both attended: <strong>${eventTitle}</strong>${eventDate ? ` on ${new Date(eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>` : ''}
          <p>We hope you can connect and explore potential opportunities together.</p>
          <p>Best regards,<br>IWant2Network Team</p>
        </div>
      `
    }

    // Send via SMTP2GO
    const smtpSetting = await prisma.integrationSetting.findUnique({
      where: { key: 'smtp2go_api_key' },
    })
    if (!smtpSetting) {
      return NextResponse.json({ error: 'SMTP2GO not configured' }, { status: 400 })
    }

    const smtp = new Smtp2goService(decrypt(smtpSetting.valueEncrypted))
    const result = await smtp.sendEmail({
      sender: 'IWant2Network <introductions@iwant2network.com>',
      to: [personA.email, personB.email],
      subject,
      html_body: htmlBody,
    })

    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        personAId,
        personBId,
        eventbriteEventId: eventbriteEventId || null,
        eventTitle: eventTitle || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        templateId: templateId || null,
        personalNote: personalNote || null,
        sentBy: (session.user as any)?.id,
        smtp2goEmailId: result.request_id,
      },
      include: { personA: true, personB: true },
    })

    // Log emails
    await prisma.emailLog.createMany({
      data: [
        {
          referralId: referral.id,
          email: personA.email,
          type: 'referral',
          smtp2goEmailId: result.request_id,
          status: 'sent',
        },
        {
          referralId: referral.id,
          email: personB.email,
          type: 'referral',
          smtp2goEmailId: result.request_id,
          status: 'sent',
        },
      ],
    })

    return NextResponse.json(referral, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send referral' },
      { status: 500 }
    )
  }
}
