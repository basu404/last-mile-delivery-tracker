import { OrderType, Prisma, RateType } from '@prisma/client';
import { prisma } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';

export interface CreateRateCardInput {
  orderType: OrderType;
  fromZoneId: string;
  toZoneId: string;
  rateType: RateType;
  basePrice: number;
  pricePerKg: number;
  codSurchargeFlat: number;
  codSurchargePct: number;
}

export interface UpdateRateCardInput {
  basePrice?: number;
  pricePerKg?: number;
  codSurchargeFlat?: number;
  codSurchargePct?: number;
  isActive?: boolean;
}

const zoneNames = {
  fromZone: { select: { id: true, name: true } },
  toZone: { select: { id: true, name: true } },
} satisfies Prisma.RateCardInclude;

async function assertZonesExist(fromZoneId: string, toZoneId: string): Promise<void> {
  const count = await prisma.zone.count({
    where: { id: { in: [...new Set([fromZoneId, toZoneId])] } },
  });
  const expectedCount = new Set([fromZoneId, toZoneId]).size;
  if (count !== expectedCount) {
    throw new ApiError(400, 'One or both zone IDs do not exist');
  }
}

export async function createRateCard(input: CreateRateCardInput) {
  await assertZonesExist(input.fromZoneId, input.toZoneId);

  try {
    return await prisma.rateCard.create({ data: input, include: zoneNames });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'A rate card already exists for this order type and zone pair');
    }
    throw error;
  }
}

export function listRateCards() {
  return prisma.rateCard.findMany({
    include: zoneNames,
    orderBy: [{ orderType: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function updateRateCard(id: string, input: UpdateRateCardInput) {
  const existing = await prisma.rateCard.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, 'Rate card not found');
  }

  return prisma.rateCard.update({ where: { id }, data: input, include: zoneNames });
}
