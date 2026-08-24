import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as rateCardController from './rateCard.controller';

export const rateCardRouter = Router();

rateCardRouter.use(requireAuth, requireRole([Role.admin]));
rateCardRouter.post('/', rateCardController.createRateCard);
rateCardRouter.get('/', rateCardController.listRateCards);
rateCardRouter.patch('/:id', rateCardController.updateRateCard);
