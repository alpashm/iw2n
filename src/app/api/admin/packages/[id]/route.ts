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
    const pkg = await prisma.package.findUnique({
      where: { id: params.id },
      include: { memberPackages: { include: { user: true } } },
    })
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(pkg)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch package' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const pkg = await prisma.package.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: parseFloat(data.price) }),
        ...(data.billingType !== undefined && { billingType: data.billingType }),
        ...(data.includedGroups !== undefined && { includedGroups: data.includedGroups }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
    return NextResponse.json(pkg)
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.package.update({
      where: { id: params.id },
      data: { status: 'archived' },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to archive package' }, { status: 500 })
  }
}
