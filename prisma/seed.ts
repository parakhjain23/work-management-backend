import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      name: 'Demo Organization',
    },
  });
  console.log('✅ Created organization:', org.name);

  // Create demo category
  const category = await prisma.category.upsert({
    where: { 
      orgId_keyName: {
        orgId: org.id,
        keyName: 'general'
      }
    },
    update: {},
    create: {
      orgId: org.id,
      keyName: 'general',
      name: 'General Tasks',
      externalTool: null,
    },
  });
  console.log('✅ Created category:', category.name);

  // Create some demo work items
  const workItem1 = await prisma.workItem.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      categoryId: category.id,
      title: 'Setup project infrastructure',
      description: 'Initialize the project with proper folder structure and dependencies',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });
  console.log('✅ Created work item:', workItem1.title);

  const workItem2 = await prisma.workItem.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      id: BigInt(2),
      categoryId: category.id,
      title: 'Implement authentication',
      description: 'Add user authentication and authorization',
      status: 'CAPTURED',
      priority: 'MEDIUM',
    },
  });
  console.log('✅ Created work item:', workItem2.title);

  const workItem3 = await prisma.workItem.upsert({
    where: { id: BigInt(3) },
    update: {},
    create: {
      id: BigInt(3),
      categoryId: category.id,
      title: 'Design database schema',
      description: 'Create comprehensive database schema for work management',
      status: 'CLOSED',
      priority: 'HIGH',
    },
  });
  console.log('✅ Created work item:', workItem3.title);

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
