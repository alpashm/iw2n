import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

export async function getIntegrationValue(key: string): Promise<string | null> {
  const setting = await prisma.integrationSetting.findUnique({ where: { key } })
  if (!setting || setting.status === 'unconfigured') return null
  try {
    return decrypt(setting.valueEncrypted)
  } catch {
    return null
  }
}

export async function getIntegrationSetting(key: string) {
  return prisma.integrationSetting.findUnique({ where: { key } })
}
