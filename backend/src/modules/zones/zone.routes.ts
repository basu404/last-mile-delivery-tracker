import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as zoneController from './zone.controller';

export const zoneRouter = Router();

zoneRouter.get('/', zoneController.listZones);
zoneRouter.get(
  '/:id/pincodes',
  requireAuth,
  requireRole([Role.admin]),
  zoneController.listPincodes,
);
zoneRouter.delete(
  '/:zoneId/pincodes/:pincodeId',
  requireAuth,
  requireRole([Role.admin]),
  zoneController.removePincode,
);
zoneRouter.patch(
  '/:zoneId/pincodes/:pincodeId',
  requireAuth,
  requireRole([Role.admin]),
  zoneController.updatePincode,
);
zoneRouter.post('/', requireAuth, requireRole([Role.admin]), zoneController.createZone);
zoneRouter.post(
  '/:id/pincodes',
  requireAuth,
  requireRole([Role.admin]),
  zoneController.addPincodes,
);
