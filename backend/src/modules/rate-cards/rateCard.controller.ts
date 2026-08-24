import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/apiResponse';
import * as rateCardService from './rateCard.service';

const nonnegativeMoney = z.number().finite().nonnegative();

const createRateCardSchema = z.object({
  orderType: z.enum(['B2B', 'B2C']),
  fromZoneId: z.string().uuid(),
  toZoneId: z.string().uuid(),
  rateType: z.enum(['intra_zone', 'inter_zone']),
  basePrice: nonnegativeMoney,
  pricePerKg: nonnegativeMoney,
  codSurchargeFlat: nonnegativeMoney.default(0),
  codSurchargePct: nonnegativeMoney.default(0),
});

const updateRateCardSchema = z
  .object({
    basePrice: nonnegativeMoney.optional(),
    pricePerKg: nonnegativeMoney.optional(),
    codSurchargeFlat: nonnegativeMoney.optional(),
    codSurchargePct: nonnegativeMoney.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'At least one field is required');

const rateCardParamsSchema = z.object({ id: z.string().uuid() });

export async function createRateCard(request: Request, response: Response, next: NextFunction) {
  try {
    const input = createRateCardSchema.parse(request.body);
    sendSuccess(response, await rateCardService.createRateCard(input), 201, 'Rate card created');
  } catch (error) {
    next(error);
  }
}

export async function listRateCards(_request: Request, response: Response, next: NextFunction) {
  try {
    sendSuccess(response, await rateCardService.listRateCards());
  } catch (error) {
    next(error);
  }
}

export async function updateRateCard(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = rateCardParamsSchema.parse(request.params);
    const input = updateRateCardSchema.parse(request.body);
    sendSuccess(response, await rateCardService.updateRateCard(id, input), 200, 'Rate card updated');
  } catch (error) {
    next(error);
  }
}
