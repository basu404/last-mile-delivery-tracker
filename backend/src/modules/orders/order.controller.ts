import type { NextFunction, Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import {
  assignAgentManually,
  autoAssignAgent,
  safeAgent,
} from '../../services/assignmentEngine';
import { sendSuccess } from '../../utils/apiResponse';
import * as orderService from './order.service';

const chargeInputShape = {
  pickupPincode: z.string().trim().regex(/^\d{4,10}$/, 'Pickup pincode must contain 4 to 10 digits'),
  dropPincode: z.string().trim().regex(/^\d{4,10}$/, 'Drop pincode must contain 4 to 10 digits'),
  lengthCm: z.number().finite().positive(),
  breadthCm: z.number().finite().positive(),
  heightCm: z.number().finite().positive(),
  actualWeightKg: z.number().finite().positive(),
  orderType: z.enum(['B2B', 'B2C']),
  paymentType: z.enum(['prepaid', 'cod']),
} as const;

const quoteSchema = z.object(chargeInputShape).strict();

const createOrderSchema = z
  .object({
    ...chargeInputShape,
    customerId: z.string().uuid().optional(),
    pickupAddress: z.string().trim().min(5).max(500),
    dropAddress: z.string().trim().min(5).max(500),
    scheduledDate: z.coerce.date().optional(),
  })
  .strict();

const orderParamsSchema = z.object({ id: z.string().uuid() });
const statusSchema = z.object({
  status: z.enum([
    'created',
    'assigned',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'rescheduled',
    'cancelled',
  ]),
  notes: z.string().trim().min(1).max(500).optional(),
});
const assignSchema = z.object({ agentId: z.string().uuid() });
const rescheduleSchema = z.object({
  newDate: z.coerce.date().refine((date) => date.getTime() > Date.now(), 'newDate must be in the future'),
});
const listOrdersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  zoneId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function quoteOrder(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await orderService.quoteOrder(quoteSchema.parse(request.body));
    sendSuccess(response, result);
  } catch (error) {
    next(error);
  }
}

export async function createOrder(request: Request, response: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(request.body);
    const result = await orderService.createOrder(input, request.user!);
    sendSuccess(response, result, 201, 'Order created');
  } catch (error) {
    next(error);
  }
}

export async function getOrder(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    sendSuccess(response, await orderService.getOrder(id, request.user!));
  } catch (error) {
    next(error);
  }
}

export async function getTimeline(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    sendSuccess(response, await orderService.getTimeline(id, request.user!));
  } catch (error) {
    next(error);
  }
}

export async function listOrders(request: Request, response: Response, next: NextFunction) {
  try {
    sendSuccess(response, await orderService.listOrders(listOrdersSchema.parse(request.query)));
  } catch (error) {
    next(error);
  }
}

export async function listMine(request: Request, response: Response, next: NextFunction) {
  try {
    sendSuccess(response, await orderService.listCustomerOrders(request.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function listAssigned(request: Request, response: Response, next: NextFunction) {
  try {
    sendSuccess(response, await orderService.listAssignedOrders(request.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    const { status, notes } = statusSchema.parse(request.body);
    sendSuccess(
      response,
      await orderService.updateOrderStatus(id, status as OrderStatus, request.user!, notes),
      200,
      'Order status updated',
    );
  } catch (error) {
    next(error);
  }
}

export async function overrideStatus(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    const { status, notes } = statusSchema.parse(request.body);
    sendSuccess(
      response,
      await orderService.overrideOrderStatus(id, status as OrderStatus, request.user!, notes),
      200,
      'Order status overridden',
    );
  } catch (error) {
    next(error);
  }
}

export async function reschedule(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    const { newDate } = rescheduleSchema.parse(request.body);
    sendSuccess(
      response,
      await orderService.rescheduleOrder(id, newDate, request.user!),
      200,
      'Order rescheduled and assignment attempted',
    );
  } catch (error) {
    next(error);
  }
}

export async function manualAssign(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    const { agentId } = assignSchema.parse(request.body);
    sendSuccess(
      response,
      await assignAgentManually(id, agentId, request.user!.id),
      200,
      'Agent assigned',
    );
  } catch (error) {
    next(error);
  }
}

export async function autoAssign(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = orderParamsSchema.parse(request.params);
    const agent = await autoAssignAgent(id, request.user!.id);
    sendSuccess(
      response,
      agent ? safeAgent(agent) : null,
      200,
      agent ? 'Agent assigned automatically' : 'No available agent in pickup zone',
    );
  } catch (error) {
    next(error);
  }
}
