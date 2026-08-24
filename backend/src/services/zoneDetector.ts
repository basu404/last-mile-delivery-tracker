import type { Zone } from '@prisma/client';
import { prisma } from '../config/env';
import { ApiError } from '../middleware/error.middleware';

export async function getZoneForPincode(pincode: string): Promise<Zone> {
  const mapping = await prisma.zonePincode.findUnique({
    where: { pincode },
    include: { zone: true },
  });

  if (!mapping) {
    throw new ApiError(400, `No zone mapped for pincode ${pincode}`);
  }

  return mapping.zone;
}
