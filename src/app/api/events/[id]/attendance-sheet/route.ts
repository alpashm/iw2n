import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAttendanceSheetPdf } from '@/lib/pdf/attendanceSheet'
import { format } from 'date-fns'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { group: true },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const pdfBuffer = await generateAttendanceSheetPdf(params.id)

    const dateStr = format(event.startDatetime, 'yyyyMMdd')
    const filename = `${dateStr}-${event.group.slug}-AttendanceSheet.pdf`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('Attendance sheet generation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PDF generation failed' },
      { status: 500 }
    )
  }
}
