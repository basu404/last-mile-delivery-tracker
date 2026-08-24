import { OrderType, PaymentType, RateType } from '@prisma/client';
import { prisma } from '../config/env';
import { ApiError } from '../middleware/error.middleware';
import { getZoneForPincode } from './zoneDetector';

export interface ChargeInput {
  pickupPincode: string;
  dropPincode: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'prepaid' | 'cod';
}

export interface ChargeBreakdown {
  pickupZoneId: string;
  dropZoneId: string;
  pickupZoneName: string;
  dropZoneName: string;
  volumetricWeightKg: number;
  actualWeightKg: number;
  chargeableWeightKg: number;
  rateCardId: string;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

export interface ResolvedChargeData {
  pickupZone: { id: string; name: string };
  dropZone: { id: string; name: string };
  rateCard: {
    id: string;
    basePrice: number;
    pricePerKg: number;
    codSurchargeFlat: number;
    codSurchargePct: number;
  };
}

/** Deterministic pricing core: no I/O, no database access, and no mutation. */
export function calculateChargeFromResolvedData(
  input: ChargeInput,
  resolved: ResolvedChargeData,
): ChargeBreakdown {
  const volumetricWeightKg = (input.lengthCm * input.breadthCm * input.heightCm) / 5000;
  const chargeableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg);
  const baseCharge = resolved.rateCard.basePrice + chargeableWeightKg * resolved.rateCard.pricePerKg;
  const codSurcharge =
    input.paymentType === PaymentType.cod
      ? resolved.rateCard.codSurchargeFlat +
        (baseCharge * resolved.rateCard.codSurchargePct) / 100
      : 0;

  return {
    pickupZoneId: resolved.pickupZone.id,
    dropZoneId: resolved.dropZone.id,
    pickupZoneName: resolved.pickupZone.name,
    dropZoneName: resolved.dropZone.name,
    volumetricWeightKg,
    actualWeightKg: input.actualWeightKg,
    chargeableWeightKg,
    rateCardId: resolved.rateCard.id,
    baseCharge,
    codSurcharge,
    totalCharge: baseCharge + codSurcharge,
  };
}

/** Required public API: resolves configuration, then delegates all arithmetic to the pure core. */
export async function calculateCharge(input: ChargeInput): Promise<ChargeBreakdown> {
  const [pickupZone, dropZone] = await Promise.all([
    getZoneForPincode(input.pickupPincode),
    getZoneForPincode(input.dropPincode),
  ]);
  const rateType = pickupZone.id === dropZone.id ? RateType.intra_zone : RateType.inter_zone;

  const rateCard = await prisma.rateCard.findFirst({
    where: {
      orderType: input.orderType as OrderType,
      fromZoneId: pickupZone.id,
      toZoneId: dropZone.id,
      rateType,
      isActive: true,
    },
    select: {
      id: true,
      basePrice: true,
      pricePerKg: true,
      codSurchargeFlat: true,
      codSurchargePct: true,
    },
  });

  if (!rateCard) {
    throw new ApiError(400, 'No rate card configured for this zone pair');
  }

  return calculateChargeFromResolvedData(input, { pickupZone, dropZone, rateCard });
}
