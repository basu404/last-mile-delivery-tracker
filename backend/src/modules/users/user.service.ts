import { OrderStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';
import { hashPassword } from '../../utils/password';

const ACTIVE_STATUSES = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.in_transit,
  OrderStatus.out_for_delivery,
];

interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  assignedZoneId: string;
}

async function findAgents(zoneId?: string, availableOnly = false) {
  const agents = await prisma.user.findMany({
    where: {
      role: Role.agent,
      ...(availableOnly ? { isAvailable: true } : {}),
      ...(zoneId ? { assignedZoneId: zoneId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      assignedZoneId: true,
      currentLat: true,
      currentLng: true,
      isAvailable: true,
      createdAt: true,
      assignedZone: { select: { id: true, name: true } },
      _count: {
        select: { ordersAsAgent: { where: { status: { in: ACTIVE_STATUSES } } } },
      },
    },
    orderBy: [{ assignedZoneId: 'asc' }, { createdAt: 'asc' }],
  });

  return agents.map(({ _count, ...agent }) => ({
    ...agent,
    activeOrderCount: _count.ordersAsAgent,
  }));
}

export function listAgents(zoneId?: string) {
  return findAgents(zoneId);
}

export function listAvailableAgents(zoneId?: string) {
  return findAgents(zoneId, true);
}

export async function createAgent(input: CreateAgentInput) {
  const zone = await prisma.zone.findUnique({
    where: { id: input.assignedZoneId },
    select: { id: true },
  });

  if (!zone) {
    throw new ApiError(404, 'Zone not found');
  }

  try {
    const agent = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: Role.agent,
        phone: input.phone,
        assignedZoneId: input.assignedZoneId,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        assignedZoneId: true,
        currentLat: true,
        currentLng: true,
        isAvailable: true,
        createdAt: true,
        assignedZone: { select: { id: true, name: true } },
      },
    });

    return { ...agent, activeOrderCount: 0 };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'An account with this email already exists');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ApiError(404, 'Zone not found');
    }
    throw error;
  }
}
