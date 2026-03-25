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
    const signatures = await prisma.emailSignature.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(signatures)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, htmlContent, isDefault, groupId } = await request.json()

    if (!name || !htmlContent) {
      return NextResponse.json({ error: 'name and htmlContent are required' }, { status: 400 })
    }

    if (isDefault) {
      await prisma.emailSignature.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    }

    const sig = await prisma.emailSignature.create({
      data: { name, htmlContent, isDefault: isDefault || false, groupId: groupId || null },
    })
    return NextResponse.json(sig, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, name, htmlContent, isDefault, groupId } = await request.json()

    if (isDefault) {
      await prisma.emailSignature.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } })
    }

    const sig = await prisma.emailSignature.update({
      where: { id },
      data: { name, htmlContent, isDefault, groupId: groupId || null },
    })
    return NextResponse.json(sig)
  } catch {
    return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await prisma.emailSignature.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 })
  }
}
