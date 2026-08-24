import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/apiResponse';
import * as userService from './user.service';

const availableAgentsQuerySchema = z.object({ zoneId: z.string().uuid().optional() });
const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().min(7).max(20).optional(),
  assignedZoneId: z.string().uuid(),
});

export async function listAgents(request: Request, response: Response, next: NextFunction) {
  try {
    const { zoneId } = availableAgentsQuerySchema.parse(request.query);
    sendSuccess(response, await userService.listAgents(zoneId));
  } catch (error) {
    next(error);
  }
}

export async function listAvailableAgents(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { zoneId } = availableAgentsQuerySchema.parse(request.query);
    sendSuccess(response, await userService.listAvailableAgents(zoneId));
  } catch (error) {
    next(error);
  }
}

export async function createAgent(request: Request, response: Response, next: NextFunction) {
  try {
    const agent = await userService.createAgent(createAgentSchema.parse(request.body));
    sendSuccess(response, agent, 201, 'Agent created');
  } catch (error) {
    next(error);
  }
}
