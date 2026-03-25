import { Worker, Job } from 'bullmq'
import { getRedisConnection, keapSyncQueue } from './queue'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decrypt } from '@/lib/encryption'
import { KeapService } from '@/lib/integrations/keap'

export async function triggerKeapSync(): Promise<void> {
  await keapSyncQueue.add('keap-sync', {}, { jobId: `keap-sync-${Date.now()}` })
}

export async function runKeapSync(): Promise<{ contacts: number; errors: string[] }> {
  const errors: string[] = []
  let contactsProcessed = 0

  // Get Keap credentials
  const tokenSetting = await prisma.integrationSetting.findUnique({ where: { key: 'keap_pat' } })
  if (!tokenSetting) {
    throw new Error('Keap PAT not configured')
  }

  const token = decrypt(tokenSetting.valueEncrypted)
  const keap = new KeapService(token)

  try {
    // Sync all contacts with pagination
    const allContacts = await keap.getAllContacts()
    contactsProcessed = allContacts.length

    for (const contact of allContacts) {
      try {
        const primaryEmail =
          contact.email_addresses?.find((e) => e.field === 'EMAIL1')?.email ||
          contact.email_addresses?.[0]?.email ||
          ''

        const primaryPhone =
          contact.phone_numbers?.find((p) => p.field === 'PHONE1')?.number ||
          contact.phone_numbers?.[0]?.number ||
          null

        await prisma.keapContactCache.upsert({
          where: { keapId: String(contact.id) },
          update: {
            firstName: contact.given_name || '',
            lastName: contact.family_name || '',
            email: primaryEmail,
            phone: primaryPhone,
            company: contact.company?.company_name || null,
            tags: contact.tag_ids || [],
            customFields: contact.custom_fields ? Object.fromEntries(
              contact.custom_fields.map((f) => [String(f.id), f.content])
            ) : {},
            rawData: contact as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
          },
          create: {
            keapId: String(contact.id),
            firstName: contact.given_name || '',
            lastName: contact.family_name || '',
            email: primaryEmail,
            phone: primaryPhone,
            company: contact.company?.company_name || null,
            tags: contact.tag_ids || [],
            customFields: contact.custom_fields ? Object.fromEntries(
              contact.custom_fields.map((f) => [String(f.id), f.content])
            ) : {},
            rawData: contact as unknown as Prisma.InputJsonValue,
          },
        })
      } catch (err) {
        errors.push(`Contact ${contact.id}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    // Sync tags and apply tag-to-group mapping
    await syncTagGroupMappings(keap, errors)
  } catch (err) {
    errors.push(`Sync failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // Log to SyncLog
  await prisma.syncLog.create({
    data: {
      source: 'keap',
      direction: 'pull',
      records: contactsProcessed,
      errors: errors.length > 0 ? errors.join('; ') : null,
    },
  })

  return { contacts: contactsProcessed, errors }
}

async function syncTagGroupMappings(keap: KeapService, errors: string[]): Promise<void> {
  // Get all groups that have a keapTagId configured
  const groups = await prisma.group.findMany({
    where: { keapTagId: { not: null } },
  })

  if (groups.length === 0) return

  for (const group of groups) {
    try {
      // Find all cached contacts with this tag
      const tagId = parseInt(group.keapTagId!)
      const contactsWithTag = await prisma.keapContactCache.findMany({
        where: {
          tags: {
            array_contains: tagId,
          },
        },
      })

      for (const cachedContact of contactsWithTag) {
        // Try to find matching EMS user
        const user = await prisma.user.findFirst({
          where: { email: cachedContact.email },
        })

        if (user) {
          // Create GroupMembership if it doesn't exist
          await prisma.groupMembership.upsert({
            where: { userId_groupId: { userId: user.id, groupId: group.id } },
            update: { status: 'active' },
            create: {
              userId: user.id,
              groupId: group.id,
              status: 'active',
            },
          })
        }
      }
    } catch (err) {
      errors.push(
        `Tag mapping for group ${group.id}: ${err instanceof Error ? err.message : 'unknown error'}`
      )
    }
  }
}

export function startKeapSyncWorker() {
  const worker = new Worker(
    'keap-sync',
    async (job: Job) => {
      console.log('Running Keap sync job:', job.id)
      const result = await runKeapSync()
      console.log(`Keap sync complete: ${result.contacts} contacts, ${result.errors.length} errors`)
      return result
    },
    { connection: getRedisConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error('Keap sync job failed:', job?.id, err)
  })

  return worker
}
