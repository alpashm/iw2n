import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  try {
    const templates = await prisma.emailTemplate.findMany({
      where: category ? { category } : {},
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, category, subject, htmlBody } = await request.json()

    if (!name || !category || !subject || !htmlBody) {
      return NextResponse.json({ error: 'name, category, subject, htmlBody are required' }, { status: 400 })
    }

    const template = await prisma.emailTemplate.create({
      data: { name, category, subject, htmlBody },
    })
    return NextResponse.json(template, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
