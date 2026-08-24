import { OrderStatus, Prisma, Role, type User } from '@prisma/client';
import { prisma } from '../config/env';
import { ApiError } from '../middleware/error.middleware';
import { sendAssignmentNotifications } from '../modules/notifications/notification.service';
import { canTransition } from './statusMachine';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.in_transit,
  OrderStatus.out_for_delivery,
];

function safeAgent(agent: User) {
  const { passwordHash: _passwordHash, ...result } = agent;
  return result;
}

async function assignSelectedAgent(orderId: string, agent: User, changedById: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { id: true, email: true } } },
  });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (!canTransition(order.status, OrderStatus.assigned)) {
    throw new ApiError(400, `Order cannot be assigned from status ${order.status}`);
  }

  try {
    const updated = await prisma.order.update({
      where: { id: order.id, status: order.status },
      data: {
        assignedAgentId: agent.id,
        status: OrderStatus.assigned,
        statusHistory: {
          create: {
            status: OrderStatus.assigned,
            changedById,
            notes: `Assigned to ${agent.name}`,
          },
        },
      },
      include: {
        customer: { select: { id: true, email: true } },
        assignedAgent: {
          select: { id: true, name: true, email: true, phone: true, assignedZoneId: true },
        },
        statusHistory: { orderBy: { timestamp: 'asc' } },
      },
    });

    await sendAssignmentNotifications(updated, agent);
    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(409, 'Order status changed while assignment was in progress');
    }
    throw error;
  }
}

export async function autoAssignAgent(orderId: string, changedById?: string): Promise<User | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (!canTransition(order.status, OrderStatus.assigned)) {
    throw new ApiError(400, `Order cannot be assigned from status ${order.status}`);
  }

  const agents = await prisma.user.findMany({
    where: {
      role: Role.agent,
      isAvailable: true,
      assignedZoneId: order.pickupZoneId,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const actorId = changedById ?? order.createdById;
  if (agents.length === 0) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        changedById: actorId,
        notes: 'No available agent in pickup zone',
      },
    });
    return null;
  }

  const loadRows = await prisma.order.groupBy({
    by: ['assignedAgentId'],
    where: {
      assignedAgentId: { in: agents.map((agent) => agent.id) },
      status: { in: ACTIVE_ORDER_STATUSES },
    },
    _count: { _all: true },
  });
  const loads = new Map(loadRows.map((row) => [row.assignedAgentId, row._count._all]));
  agents.sort((left, right) => (loads.get(left.id) ?? 0) - (loads.get(right.id) ?? 0));

  const selected = agents[0];
  await assignSelectedAgent(order.id, selected, actorId);
  return selected;
}

export async function assignAgentManually(orderId: string, agentId: string, changedById: string) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== Role.agent) {
    throw new ApiError(400, 'A valid delivery agent is required');
  }
  if (!agent.isAvailable) {
    throw new ApiError(400, 'The selected agent is not available');
  }

  return assignSelectedAgent(orderId, agent, changedById);
}

export { safeAgent };
