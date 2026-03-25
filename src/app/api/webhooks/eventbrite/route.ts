import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { EventbriteService } from '@/lib/integrations/eventbrite'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action || body.config?.action

    if (!action) {
      return NextResponse.json({ received: true })
    }

    if (action === 'order.placed' || action === 'attendee.updated') {
      const apiUrl = body.api_url
      if (!apiUrl) return NextResponse.json({ received: true })

      // Fetch the actual order/attendee data from Eventbrite
      const tokenSetting = await prisma.integrationSetting.findUnique({
        where: { key: 'eventbrite_token' },
      })
      if (!tokenSetting) {
        return NextResponse.json({ error: 'Eventbrite not configured' }, { status: 500 })
      }

      const token = decrypt(tokenSetting.valueEncrypted)

      const ebResponse = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!ebResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch Eventbrite data' }, { status: 500 })
      }

      const data = await ebResponse.json()

      // Handle order.placed - get attendees from the order
      if (action === 'order.placed') {
        await processOrder(data, token)
      } else if (action === 'attendee.updated') {
        await processAttendeeUpdate(data)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Eventbrite webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function processOrder(orderData: any, token: string) {
  const eventbriteEventId = String(orderData.event_id || '')
  if (!eventbriteEventId) return

  // Find EMS event by Eventbrite ID
  const emsEvent = await prisma.event.findFirst({
    where: { eventbriteEventId },
    include: { group: true },
  })
  if (!emsEvent) return

  const attendees = orderData.attendees || []
  for (const att of attendees) {
    const orderId = String(att.id || orderData.id || '')
    if (!orderId) continue

    const profile = att.profile || {}
    const email = profile.email || ''
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

    const existing = await prisma.attendee.findFirst({
      where: { eventbriteOrderId: orderId },
    })

    if (!existing) {
      await prisma.attendee.create({
        data: {
          eventId: emsEvent.id,
          name,
          email,
          ticketType: att.ticket_class_name || null,
          eventbriteOrderId: orderId,
        },
      })

      await prisma.syncLog.create({
        data: {
          source: 'eventbrite',
          direction: 'webhook',
          records: 1,
          errors: null,
        },
      })
    }
  }
}

async function processAttendeeUpdate(attendeeData: any) {
  const orderId = String(attendeeData.id || '')
  if (!orderId) return

  const profile = attendeeData.profile || {}
  const email = profile.email || ''
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

  await prisma.attendee.updateMany({
    where: { eventbriteOrderId: orderId },
    data: { name, email },
  })
}
