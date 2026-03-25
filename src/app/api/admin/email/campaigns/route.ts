import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { emailLogs: true } },
      },
      orderBy: { sentAt: 'desc' },
    })
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { groupId, templateId, subject, htmlBody, senderName, senderEmail, signatureId, scheduledAt } = data

    if (!subject || !htmlBody || !senderName || !senderEmail) {
      return NextResponse.json(
        { error: 'subject, htmlBody, senderName, senderEmail are required' },
        { status: 400 }
      )
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        groupId: groupId || null,
        templateId: templateId || null,
        subject,
        htmlBody,
        senderName,
        senderEmail,
        signatureId: signatureId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
