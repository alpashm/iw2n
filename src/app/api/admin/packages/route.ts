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
    const packages = await prisma.package.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { memberPackages: true } } },
    })
    return NextResponse.json(packages)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, description, price, billingType, includedGroups } = data

    if (!name || price === undefined || !billingType) {
      return NextResponse.json({ error: 'name, price, billingType are required' }, { status: 400 })
    }

    const pkg = await prisma.package.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        billingType,
        includedGroups: includedGroups || [],
        status: 'active',
      },
    })
    return NextResponse.json(pkg, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}
