import { prisma } from '@/lib/prisma'

export async function getAllSignatures() {
  return prisma.emailSignature.findMany({ orderBy: { name: 'asc' } })
}

export async function getSignatureById(id: string) {
  return prisma.emailSignature.findUnique({ where: { id } })
}

export async function createSignature(data: {
  name: string
  htmlContent: string
  isDefault?: boolean
  groupId?: string
}) {
  if (data.isDefault) {
    // Clear other defaults
    await prisma.emailSignature.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }
  return prisma.emailSignature.create({ data })
}

export async function updateSignature(
  id: string,
  data: { name?: string; htmlContent?: string; isDefault?: boolean; groupId?: string }
) {
  if (data.isDefault) {
    await prisma.emailSignature.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }
  return prisma.emailSignature.update({ where: { id }, data })
}

export async function deleteSignature(id: string) {
  return prisma.emailSignature.delete({ where: { id } })
}
