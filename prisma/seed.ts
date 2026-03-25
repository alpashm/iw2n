import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } })
  if (existing) {
    console.log('Admin user already exists, skipping seed.')
    return
  }

  const passwordHash = await bcrypt.hash('admin', 10)

  await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      mustChangePassword: true,
    },
  })

  console.log('Admin user created: admin@admin.com / admin')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
