import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as userController from './user.controller';

export const agentRouter = Router();

agentRouter.get('/', requireAuth, requireRole([Role.admin]), userController.listAgents);

agentRouter.get(
  '/available',
  requireAuth,
  requireRole([Role.admin]),
  userController.listAvailableAgents,
);

agentRouter.post('/', requireAuth, requireRole([Role.admin]), userController.createAgent);
