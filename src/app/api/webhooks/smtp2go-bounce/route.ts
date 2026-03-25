import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // SMTP2GO bounce webhook payload
    const events = Array.isArray(body) ? body : [body]

    for (const event of events) {
      const email = event.email || event.recipient
      const status = event.event || event.type || 'bounced'

      if (!email) continue

      if (
        status === 'bounce' ||
        status === 'hard_bounce' ||
        status === 'soft_bounce' ||
        status === 'bounced'
      ) {
        // Update all email logs for this address to bounced
        await prisma.emailLog.updateMany({
          where: { email: email.toLowerCase() },
          data: { status: 'bounced' },
        })

        // Also create a suppression record
        await prisma.emailLog.create({
          data: {
            email: email.toLowerCase(),
            type: 'campaign',
            status: 'bounced',
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('SMTP2GO bounce webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
