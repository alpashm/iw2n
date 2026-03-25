import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: getRedisConnection() })
}

export const keapSyncQueue = createQueue('keap-sync')
export const eventbriteSyncQueue = createQueue('eventbrite-sync')
export const emailCampaignQueue = createQueue('email-campaign')
export const inboxPollQueue = createQueue('inbox-poll')
export const attendanceSheetQueue = createQueue('attendance-sheet')
