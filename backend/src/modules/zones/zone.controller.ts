import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/apiResponse';
import * as zoneService from './zone.service';

const createZoneSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const zoneParamsSchema = z.object({ id: z.string().uuid() });
const pincodeParamsSchema = z.object({
  zoneId: z.string().uuid(),
  pincodeId: z.string().uuid(),
});

const addPincodesSchema = z.object({
  pincodes: z
    .array(z.string().trim().regex(/^\d{4,10}$/, 'Pincode must contain 4 to 10 digits'))
    .min(1)
    .max(100)
    .transform((pincodes) => [...new Set(pincodes)]),
});

const updatePincodeSchema = z
  .object({
    newZoneId: z.string().uuid().optional(),
    pincode: z.string().trim().regex(/^\d{4,10}$/, 'Pincode must contain 4 to 10 digits').optional(),
  })
  .refine((input) => input.newZoneId !== undefined || input.pincode !== undefined, {
    message: 'newZoneId or pincode is required',
  });

export async function createZone(request: Request, response: Response, next: NextFunction) {
  try {
    const { name } = createZoneSchema.parse(request.body);
    sendSuccess(response, await zoneService.createZone(name), 201, 'Zone created');
  } catch (error) {
    next(error);
  }
}

export async function addPincodes(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = zoneParamsSchema.parse(request.params);
    const { pincodes } = addPincodesSchema.parse(request.body);
    sendSuccess(response, await zoneService.addPincodes(id, pincodes), 201, 'Pincodes mapped');
  } catch (error) {
    next(error);
  }
}

export async function listPincodes(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = zoneParamsSchema.parse(request.params);
    sendSuccess(response, await zoneService.listPincodes(id));
  } catch (error) {
    next(error);
  }
}

export async function removePincode(request: Request, response: Response, next: NextFunction) {
  try {
    const { zoneId, pincodeId } = pincodeParamsSchema.parse(request.params);
    sendSuccess(
      response,
      await zoneService.removePincode(zoneId, pincodeId),
      200,
      'Pincode removed',
    );
  } catch (error) {
    next(error);
  }
}

export async function updatePincode(request: Request, response: Response, next: NextFunction) {
  try {
    const { zoneId, pincodeId } = pincodeParamsSchema.parse(request.params);
    const input = updatePincodeSchema.parse(request.body);
    sendSuccess(
      response,
      await zoneService.updatePincode(zoneId, pincodeId, input),
      200,
      'Pincode updated',
    );
  } catch (error) {
    next(error);
  }
}

export async function listZones(_request: Request, response: Response, next: NextFunction) {
  try {
    sendSuccess(response, await zoneService.listZones());
  } catch (error) {
    next(error);
  }
}
