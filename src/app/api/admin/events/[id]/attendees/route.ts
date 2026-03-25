import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const attendees = await prisma.attendee.findMany({
      where: { eventId: params.id },
      include: { user: true },
      orderBy: { registeredAt: 'asc' },
    })
    return NextResponse.json(attendees)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { attendeeId, checkedIn } = await request.json()
    const attendee = await prisma.attendee.update({
      where: { id: attendeeId },
      data: { checkedIn },
    })
    return NextResponse.json(attendee)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update attendee' }, { status: 500 })
  }
}
