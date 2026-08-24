import { OrderStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: [OrderStatus.assigned, OrderStatus.cancelled],
  assigned: [OrderStatus.picked_up, OrderStatus.cancelled],
  picked_up: [OrderStatus.in_transit],
  in_transit: [OrderStatus.out_for_delivery],
  out_for_delivery: [OrderStatus.delivered, OrderStatus.failed],
  failed: [OrderStatus.rescheduled],
  rescheduled: [OrderStatus.assigned],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
