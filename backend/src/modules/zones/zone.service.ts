import { Prisma } from '@prisma/client';
import { prisma } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';

async function assertPincodesAvailable(pincodes: string[], excludePincodeId?: string) {
  const existing = await prisma.zonePincode.findMany({
    where: {
      pincode: { in: pincodes },
      ...(excludePincodeId ? { id: { not: excludePincodeId } } : {}),
    },
    select: { pincode: true, zone: { select: { name: true } } },
  });

  if (existing.length > 0) {
    const details = existing.map((item) => `${item.pincode} (${item.zone.name})`).join(', ');
    throw new ApiError(400, `Pincode already mapped: ${details}`);
  }
}

export async function createZone(name: string) {
  try {
    return await prisma.zone.create({ data: { name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'A zone with this name already exists');
    }
    throw error;
  }
}

export async function addPincodes(zoneId: string, pincodes: string[]) {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) {
    throw new ApiError(404, 'Zone not found');
  }

  await assertPincodesAvailable(pincodes);

  try {
    await prisma.zonePincode.createMany({
      data: pincodes.map((pincode) => ({ pincode, zoneId })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'One or more pincodes are already mapped to a zone');
    }
    throw error;
  }

  return prisma.zone.findUniqueOrThrow({
    where: { id: zoneId },
    include: { pincodes: { orderBy: { pincode: 'asc' } } },
  });
}

export async function listPincodes(zoneId: string) {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: {
      id: true,
      name: true,
      pincodes: {
        select: { id: true, pincode: true },
        orderBy: { pincode: 'asc' },
      },
    },
  });

  if (!zone) {
    throw new ApiError(404, 'Zone not found');
  }

  return zone;
}

export async function removePincode(zoneId: string, pincodeId: string) {
  const mapping = await prisma.zonePincode.findFirst({
    where: { id: pincodeId, zoneId },
    select: { id: true, pincode: true, zoneId: true },
  });

  if (!mapping) {
    throw new ApiError(404, 'Pincode mapping not found in this zone');
  }

  try {
    return await prisma.zonePincode.delete({ where: { id: mapping.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(404, 'Pincode mapping not found in this zone');
    }
    throw error;
  }
}

export interface UpdatePincodeInput {
  newZoneId?: string;
  pincode?: string;
}

export async function updatePincode(
  zoneId: string,
  pincodeId: string,
  input: UpdatePincodeInput,
) {
  const mapping = await prisma.zonePincode.findFirst({
    where: { id: pincodeId, zoneId },
    select: { id: true, pincode: true, zoneId: true },
  });
  if (!mapping) {
    throw new ApiError(404, 'Pincode mapping not found in this zone');
  }

  const targetZoneId = input.newZoneId ?? mapping.zoneId;
  const targetZone = await prisma.zone.findUnique({
    where: { id: targetZoneId },
    select: { id: true },
  });
  if (!targetZone) {
    throw new ApiError(404, 'Target zone not found');
  }

  const nextPincode = input.pincode ?? mapping.pincode;
  await assertPincodesAvailable([nextPincode], mapping.id);

  try {
    return await prisma.zonePincode.update({
      where: { id: mapping.id },
      data: { zoneId: targetZoneId, pincode: nextPincode },
      select: { id: true, pincode: true, zoneId: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'Pincode is already mapped to a zone');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(404, 'Pincode mapping not found in this zone');
    }
    throw error;
  }
}

export async function listZones() {
  const zones = await prisma.zone.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { pincodes: true } } },
  });

  return zones.map(({ _count, ...zone }) => ({
    ...zone,
    pincodeCount: _count.pincodes,
  }));
}
