import {
  OrderStatus,
  Prisma,
  Role,
  type PaymentType,
  type OrderType,
} from '@prisma/client';
import { prisma } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';
import { sendOrderNotification } from '../notifications/notification.service';
import { autoAssignAgent } from '../../services/assignmentEngine';
import { calculateCharge, type ChargeInput } from '../../services/rateEngine';
import { canTransition } from '../../services/statusMachine';

export interface CreateOrderInput extends ChargeInput {
  customerId?: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledDate?: Date;
}

export interface Actor {
  id: string;
  role: Role;
}

const orderDetailsInclude = {
  pickupZone: { select: { id: true, name: true } },
  dropZone: { select: { id: true, name: true } },
  rateCard: true,
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  assignedAgent: {
    select: { id: true, name: true, email: true, phone: true, assignedZoneId: true },
  },
  statusHistory: {
    orderBy: { timestamp: 'asc' as const },
    include: { changedBy: { select: { id: true, name: true, email: true, role: true } } },
  },
} satisfies Prisma.OrderInclude;

export async function quoteOrder(input: ChargeInput) {
  return calculateCharge(input);
}

export async function createOrder(input: CreateOrderInput, actor: Actor) {
  const customerId = actor.role === Role.customer ? actor.id : input.customerId;

  if (!customerId) {
    throw new ApiError(400, 'customerId is required when an admin creates an order');
  }
  if (actor.role === Role.customer && input.customerId && input.customerId !== actor.id) {
    throw new ApiError(403, 'Customers can only create orders for themselves');
  }

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, role: true },
  });
  if (!customer || customer.role !== Role.customer) {
    throw new ApiError(400, 'A valid customerId is required');
  }

  // Always recalculate on the server; no client-submitted charge is accepted or trusted.
  const charge = await calculateCharge(input);

  const order = await prisma.order.create({
    data: {
      customerId,
      createdById: actor.id,
      pickupAddress: input.pickupAddress,
      pickupZoneId: charge.pickupZoneId,
      dropAddress: input.dropAddress,
      dropZoneId: charge.dropZoneId,
      lengthCm: input.lengthCm,
      breadthCm: input.breadthCm,
      heightCm: input.heightCm,
      actualWeightKg: input.actualWeightKg,
      volumetricWeightKg: charge.volumetricWeightKg,
      chargeableWeightKg: charge.chargeableWeightKg,
      orderType: input.orderType as OrderType,
      paymentType: input.paymentType as PaymentType,
      rateCardId: charge.rateCardId,
      baseCharge: charge.baseCharge,
      codSurcharge: charge.codSurcharge,
      totalCharge: charge.totalCharge,
      status: OrderStatus.created,
      scheduledDate: input.scheduledDate,
      statusHistory: {
        create: {
          status: OrderStatus.created,
          changedById: actor.id,
          notes: 'Order created',
        },
      },
    },
    include: orderDetailsInclude,
  });

  await sendOrderNotification(order, OrderStatus.created);
  return order;
}

function assertOrderAccess(
  order: { customerId: string; assignedAgentId: string | null },
  actor: Actor,
): void {
  if (actor.role === Role.customer && order.customerId !== actor.id) {
    throw new ApiError(403, 'Customers can only access their own orders');
  }
  if (actor.role === Role.agent && order.assignedAgentId !== actor.id) {
    throw new ApiError(403, 'Agents can only access their assigned orders');
  }
}

export async function getOrder(orderId: string, actor: Actor) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderDetailsInclude,
  });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  assertOrderAccess(order, actor);
  return order;
}

export async function getTimeline(orderId: string, actor: Actor) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, assignedAgentId: true },
  });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  assertOrderAccess(order, actor);

  return prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { timestamp: 'asc' },
    include: { changedBy: { select: { id: true, name: true, email: true, role: true } } },
  });
}

export interface OrderFilters {
  status?: OrderStatus;
  zoneId?: string;
  agentId?: string;
  page: number;
  limit: number;
}

export async function listOrders(filters: OrderFilters) {
  const where: Prisma.OrderWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.agentId ? { assignedAgentId: filters.agentId } : {}),
    ...(filters.zoneId
      ? { OR: [{ pickupZoneId: filters.zoneId }, { dropZoneId: filters.zoneId }] }
      : {}),
  };
  const skip = (filters.page - 1) * filters.limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: orderDetailsInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export function listCustomerOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: orderDetailsInclude,
  });
}

export function listAssignedOrders(agentId: string) {
  return prisma.order.findMany({
    where: { assignedAgentId: agentId },
    orderBy: { createdAt: 'desc' },
    include: orderDetailsInclude,
  });
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: Actor,
  notes?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { id: true, email: true } } },
  });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.assignedAgentId !== actor.id) {
    throw new ApiError(403, 'Agents can only update their assigned orders');
  }
  if (!canTransition(order.status, nextStatus)) {
    throw new ApiError(400, `Cannot transition order from ${order.status} to ${nextStatus}`);
  }

  try {
    const updated = await prisma.order.update({
      where: { id: order.id, status: order.status, assignedAgentId: actor.id },
      data: {
        status: nextStatus,
        ...(nextStatus === OrderStatus.failed ? { failureReason: notes ?? 'Delivery failed' } : {}),
        statusHistory: {
          create: { status: nextStatus, changedById: actor.id, notes },
        },
      },
      include: orderDetailsInclude,
    });
    await sendOrderNotification(updated, nextStatus);
    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(409, 'Order changed while the status update was in progress');
    }
    throw error;
  }
}

export async function overrideOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: Actor,
  notes?: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const overrideNote = `Admin override from ${order.status} to ${nextStatus}${notes ? `: ${notes}` : ''}`;
  const updated = await prisma.order.update({
    where: { id: order.id, status: order.status },
    data: {
      status: nextStatus,
      ...(nextStatus === OrderStatus.failed ? { failureReason: notes ?? 'Admin override' } : {}),
      statusHistory: {
        create: { status: nextStatus, changedById: actor.id, notes: overrideNote },
      },
    },
    include: orderDetailsInclude,
  });
  await sendOrderNotification(updated, nextStatus);
  return updated;
}

export async function rescheduleOrder(orderId: string, newDate: Date, actor: Actor) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.customerId !== actor.id) {
    throw new ApiError(403, 'Customers can only reschedule their own orders');
  }
  if (!canTransition(order.status, OrderStatus.rescheduled)) {
    throw new ApiError(400, `Cannot reschedule an order with status ${order.status}`);
  }

  const rescheduled = await prisma.order.update({
    where: { id: order.id, status: order.status },
    data: {
      scheduledDate: newDate,
      assignedAgentId: null,
      status: OrderStatus.rescheduled,
      statusHistory: {
        create: {
          status: OrderStatus.rescheduled,
          changedById: actor.id,
          notes: `Rescheduled for ${newDate.toISOString()}`,
        },
      },
    },
    include: orderDetailsInclude,
  });
  await sendOrderNotification(rescheduled, OrderStatus.rescheduled);
  await autoAssignAgent(order.id, actor.id);
  return getOrder(order.id, actor);
}
