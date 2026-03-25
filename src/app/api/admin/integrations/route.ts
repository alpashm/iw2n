import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await prisma.integrationSetting.findMany()
  // Never return encrypted values to frontend
  return NextResponse.json(settings.map((s: { valueEncrypted: string; [key: string]: unknown }) => ({ ...s, valueEncrypted: s.valueEncrypted ? '••••••••' : '' })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { key, value, readOnly } = body

  const encrypted = value && value !== '••••••••' ? encrypt(value) : undefined

  const existing = await prisma.integrationSetting.findUnique({ where: { key } })

  if (existing) {
    const updated = await prisma.integrationSetting.update({
      where: { key },
      data: {
        ...(encrypted ? { valueEncrypted: encrypted, status: 'unconfigured' } : {}),
        ...(readOnly !== undefined ? { readOnly } : {}),
      },
    })
    return NextResponse.json({ ...updated, valueEncrypted: '••••••••' })
  } else {
    const created = await prisma.integrationSetting.create({
      data: {
        key,
        valueEncrypted: encrypted ?? '',
        readOnly: readOnly ?? false,
        status: 'unconfigured',
      },
    })
    return NextResponse.json({ ...created, valueEncrypted: '••••••••' })
  }
}
