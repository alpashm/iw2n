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
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { memberships: true, events: true } },
      },
    })
    return NextResponse.json(groups)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, slug, description, type, keapTagId, timezone, calendarVisibility } = data

    if (!name || !slug || !type) {
      return NextResponse.json({ error: 'name, slug, type are required' }, { status: 400 })
    }

    const group = await prisma.group.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: description || null,
        type,
        keapTagId: keapTagId || null,
        timezone: timezone || 'Europe/London',
        calendarVisibility: calendarVisibility || 'members',
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
