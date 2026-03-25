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
  const email = searchParams.get('email')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  try {
    const logs = await prisma.emailLog.findMany({
      where: {
        ...(email && { email: { contains: email, mode: 'insensitive' } }),
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        campaign: { select: { subject: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 500,
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
