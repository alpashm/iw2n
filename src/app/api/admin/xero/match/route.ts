import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getXeroService } from '@/lib/integrations/xero'
import levenshtein from 'fast-levenshtein'

function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const dist = levenshtein.get(a.toLowerCase(), b.toLowerCase())
  return 1 - dist / maxLen
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const xero = await getXeroService()
    if (!xero) {
      return NextResponse.json({ error: 'Xero not configured' }, { status: 400 })
    }

    // Fetch all Xero contacts
    const xeroContactsData = await xero.getContacts()
    const xeroContacts = xeroContactsData.Contacts || []

    // Upsert to cache
    for (const xc of xeroContacts) {
      await prisma.xeroContactCache.upsert({
        where: { xeroContactId: xc.ContactID },
        update: {
          name: xc.Name || '',
          email: xc.EmailAddress || null,
          lastSyncedAt: new Date(),
        },
        create: {
          xeroContactId: xc.ContactID,
          name: xc.Name || '',
          email: xc.EmailAddress || null,
          lastSyncedAt: new Date(),
        },
      })
    }

    // Get EMS users without Xero links
    const users = await prisma.user.findMany({
      where: { xeroLink: null },
    })

    let autoMatched = 0
    let possibleMatches = 0

    for (const user of users) {
      const fullName = `${user.firstName} ${user.lastName}`

      // First: try exact email match
      const emailMatch = xeroContacts.find(
        (xc) => xc.EmailAddress && xc.EmailAddress.toLowerCase() === user.email.toLowerCase()
      )

      if (emailMatch) {
        await prisma.xeroLink.upsert({
          where: { emsUserId: user.id },
          update: {
            xeroContactId: emailMatch.ContactID,
            matchStatus: 'auto-matched-pending',
            matchedBy: 'auto',
          },
          create: {
            emsUserId: user.id,
            xeroContactId: emailMatch.ContactID,
            matchStatus: 'auto-matched-pending',
            matchedBy: 'auto',
          },
        })
        autoMatched++
        continue
      }

      // Second: Levenshtein name match
      let bestMatch = { contact: null as typeof xeroContacts[0] | null, score: 0 }
      for (const xc of xeroContacts) {
        const score = normalizedSimilarity(fullName, xc.Name || '')
        if (score > bestMatch.score) {
          bestMatch = { contact: xc, score }
        }
      }

      if (bestMatch.score >= 0.85 && bestMatch.contact) {
        await prisma.xeroLink.upsert({
          where: { emsUserId: user.id },
          update: {
            xeroContactId: bestMatch.contact.ContactID,
            matchStatus: 'possible-match',
            matchedBy: 'auto',
          },
          create: {
            emsUserId: user.id,
            xeroContactId: bestMatch.contact.ContactID,
            matchStatus: 'possible-match',
            matchedBy: 'auto',
          },
        })
        possibleMatches++
      }
    }

    await prisma.syncLog.create({
      data: {
        source: 'xero',
        direction: 'pull',
        records: xeroContacts.length,
        errors: null,
      },
    })

    return NextResponse.json({
      xeroContactsSynced: xeroContacts.length,
      autoMatched,
      possibleMatches,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Match failed' },
      { status: 500 }
    )
  }
}
