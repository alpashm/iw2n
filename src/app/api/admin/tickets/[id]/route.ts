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
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(ticket)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.tag !== undefined && { tag: data.tag }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.aiDraft !== undefined && { aiDraft: data.aiDraft }),
        ...(data.status === 'replied' && { repliedAt: new Date() }),
      },
    })
    return NextResponse.json(ticket)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
