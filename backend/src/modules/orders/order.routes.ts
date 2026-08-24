import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as orderController from './order.controller';

export const orderRouter = Router();

orderRouter.use(requireAuth);

orderRouter.post(
  '/quote',
  requireRole([Role.customer, Role.admin]),
  orderController.quoteOrder,
);
orderRouter.post('/', requireRole([Role.customer, Role.admin]), orderController.createOrder);
orderRouter.get('/mine', requireRole([Role.customer]), orderController.listMine);
orderRouter.get('/assigned', requireRole([Role.agent]), orderController.listAssigned);
orderRouter.get('/', requireRole([Role.admin]), orderController.listOrders);

orderRouter.patch('/:id/assign', requireRole([Role.admin]), orderController.manualAssign);
orderRouter.post('/:id/auto-assign', requireRole([Role.admin]), orderController.autoAssign);
orderRouter.patch('/:id/status', requireRole([Role.agent]), orderController.updateStatus);
orderRouter.patch('/:id/override', requireRole([Role.admin]), orderController.overrideStatus);
orderRouter.post('/:id/reschedule', requireRole([Role.customer]), orderController.reschedule);
orderRouter.get('/:id/timeline', orderController.getTimeline);
orderRouter.get('/:id', orderController.getOrder);
