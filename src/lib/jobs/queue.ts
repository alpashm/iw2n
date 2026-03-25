import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  }
  return connection
}

const queues: Record<string, Queue> = {}

export function createQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getRedisConnection() })
  }
  return queues[name]
}

export function getQueue(name: string): Queue {
  return createQueue(name)
}

export const getKeapSyncQueue = () => createQueue('keap-sync')
export const getEventbriteSyncQueue = () => createQueue('eventbrite-sync')
export const getEmailCampaignQueue = () => createQueue('email-campaign')
export const getInboxPollQueue = () => createQueue('inbox-poll')
export const getAttendanceSheetQueue = () => createQueue('attendance-sheet')
