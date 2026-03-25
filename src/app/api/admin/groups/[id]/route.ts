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
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        memberships: {
          include: { user: true },
          orderBy: { joinedAt: 'desc' },
        },
        _count: { select: { events: true } },
      },
    })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(group)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, slug, description, type, keapTagId, timezone, calendarVisibility, status } = data

    const group = await prisma.group.update({
      where: { id: params.id },
      data: {
        name,
        slug: slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: description ?? undefined,
        type,
        keapTagId: keapTagId ?? null,
        timezone,
        calendarVisibility,
        status,
      },
    })
    return NextResponse.json(group)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.group.update({
      where: { id: params.id },
      data: { status: 'archived' },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}
