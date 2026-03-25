import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = params.key.replace('_api_key', '').replace('_token', '').replace('_pat', '')
  const logs = await prisma.syncLog.findMany({
    where: { source },
    orderBy: { syncedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(logs)
}
