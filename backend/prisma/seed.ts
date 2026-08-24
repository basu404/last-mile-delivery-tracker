import { OrderType, RateType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { disconnectDatabase, prisma } from '../src/config/env';

const ADMIN_PASSWORD = 'Admin@123';
const DEMO_PASSWORD = 'Demo@123';

async function main(): Promise<void> {
  const [adminPasswordHash, demoPasswordHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(DEMO_PASSWORD, 10),
  ]);

  const zoneA = await prisma.zone.upsert({
    where: { name: 'Zone A' },
    update: {},
    create: { name: 'Zone A' },
  });
  const zoneB = await prisma.zone.upsert({
    where: { name: 'Zone B' },
    update: {},
    create: { name: 'Zone B' },
  });

  for (const [pincode, zoneId] of [
    ['110001', zoneA.id],
    ['110002', zoneA.id],
    ['110003', zoneA.id],
    ['400001', zoneB.id],
    ['400002', zoneB.id],
    ['400003', zoneB.id],
  ] as const) {
    await prisma.zonePincode.upsert({
      where: { pincode },
      update: { zoneId },
      create: { pincode, zoneId },
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { passwordHash: adminPasswordHash, role: Role.admin },
    create: {
      name: 'Demo Admin',
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
      role: Role.admin,
      phone: '9000000001',
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.a@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone A Agent',
      email: 'agent.a@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000002',
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.a2@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone A Agent 2',
      email: 'agent.a2@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000005',
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.a3@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone A Agent 3',
      email: 'agent.a3@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000006',
      assignedZoneId: zoneA.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.b@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone B Agent',
      email: 'agent.b@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000003',
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.b2@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone B Agent 2',
      email: 'agent.b2@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000007',
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent.b3@test.com' },
    update: {
      passwordHash: demoPasswordHash,
      role: Role.agent,
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
    create: {
      name: 'Zone B Agent 3',
      email: 'agent.b3@test.com',
      passwordHash: demoPasswordHash,
      role: Role.agent,
      phone: '9000000008',
      assignedZoneId: zoneB.id,
      isAvailable: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: { passwordHash: demoPasswordHash, role: Role.customer },
    create: {
      name: 'Demo Customer',
      email: 'customer@test.com',
      passwordHash: demoPasswordHash,
      role: Role.customer,
      phone: '9000000004',
    },
  });

  const rateCards = [
    {
      orderType: OrderType.B2B,
      fromZoneId: zoneA.id,
      toZoneId: zoneA.id,
      rateType: RateType.intra_zone,
      basePrice: 100,
      pricePerKg: 18,
      codSurchargeFlat: 30,
      codSurchargePct: 1,
    },
    {
      orderType: OrderType.B2B,
      fromZoneId: zoneA.id,
      toZoneId: zoneB.id,
      rateType: RateType.inter_zone,
      basePrice: 180,
      pricePerKg: 25,
      codSurchargeFlat: 40,
      codSurchargePct: 1.5,
    },
    {
      orderType: OrderType.B2C,
      fromZoneId: zoneA.id,
      toZoneId: zoneA.id,
      rateType: RateType.intra_zone,
      basePrice: 60,
      pricePerKg: 14,
      codSurchargeFlat: 20,
      codSurchargePct: 1,
    },
    {
      orderType: OrderType.B2C,
      fromZoneId: zoneA.id,
      toZoneId: zoneB.id,
      rateType: RateType.inter_zone,
      basePrice: 110,
      pricePerKg: 20,
      codSurchargeFlat: 25,
      codSurchargePct: 1.25,
    },
  ];

  for (const rateCard of rateCards) {
    await prisma.rateCard.upsert({
      where: {
        orderType_fromZoneId_toZoneId: {
          orderType: rateCard.orderType,
          fromZoneId: rateCard.fromZoneId,
          toZoneId: rateCard.toZoneId,
        },
      },
      update: rateCard,
      create: rateCard,
    });
  }

  console.log('Seed complete.');
  console.log('Admin: admin@test.com / Admin@123');
  console.log('Customer: customer@test.com / Demo@123');
  console.log(
    'Agents: agent.a@test.com, agent.a2@test.com, agent.a3@test.com, agent.b@test.com, agent.b2@test.com, agent.b3@test.com / Demo@123',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
