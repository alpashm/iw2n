import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, expiresAt } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check package exists
    const pkg = await prisma.package.findUnique({ where: { id: params.id } })
    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    const mp = await prisma.memberPackage.create({
      data: {
        userId,
        packageId: params.id,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { user: true, package: true },
    })

    return NextResponse.json(mp, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to assign package' }, { status: 500 })
  }
}
