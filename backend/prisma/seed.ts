import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@repomind.dev' },
    update: {},
    create: {
      email: 'demo@repomind.dev',
      name: 'Demo User',
      provider: 'github',
      providerId: 'demo-123',
    },
  })

  console.log('✅ Created demo user:', user.email)
  console.log('🎉 Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
