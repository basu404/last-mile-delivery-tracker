import { apiClient, type ApiResponse, type User } from './client';

export type OrderStatus = 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'rescheduled' | 'cancelled';
export type OrderType = 'B2B' | 'B2C';
export type PaymentType = 'prepaid' | 'cod';

export interface ZoneRef { id: string; name: string }
export interface StatusHistory { id: string; status: OrderStatus; notes?: string | null; timestamp: string; changedBy?: Pick<User, 'id' | 'name' | 'email' | 'role'> }

export interface ChargeInput {
  pickupPincode: string;
  dropPincode: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

export interface ChargeBreakdown {
  pickupZoneId: string;
  dropZoneId: string;
  pickupZoneName: string;
  dropZoneName: string;
  volumetricWeightKg: number;
  actualWeightKg: number;
  chargeableWeightKg: number;
  rateCardId: string;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

export interface CreateOrderInput extends ChargeInput {
  pickupAddress: string;
  dropAddress: string;
  scheduledDate?: string;
}

export interface Order {
  id: string;
  customerId: string;
  pickupAddress: string;
  pickupZoneId: string;
  pickupZone: ZoneRef;
  dropAddress: string;
  dropZoneId: string;
  dropZone: ZoneRef;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  status: OrderStatus;
  assignedAgentId?: string | null;
  assignedAgent?: (Pick<User, 'id' | 'name' | 'email' | 'phone'> & { assignedZoneId?: string | null }) | null;
  customer: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  scheduledDate?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistory[];
}

export interface OrderFilters { status?: OrderStatus; zoneId?: string; agentId?: string; page?: number; limit?: number }
export interface PaginatedOrders { orders: Order[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
export interface Agent extends Pick<User, 'id' | 'name' | 'email' | 'phone'> { assignedZoneId?: string | null; isAvailable: boolean; activeOrderCount: number }

export async function getQuote(input: ChargeInput) { const { data } = await apiClient.post<ApiResponse<ChargeBreakdown>>('/orders/quote', input); return data.data; }
export async function createOrder(input: CreateOrderInput) { const { data } = await apiClient.post<ApiResponse<Order>>('/orders', input); return data.data; }
export async function listMyOrders() { const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders/mine'); return data.data; }
export async function listAssignedOrders() { const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders/assigned'); return data.data; }
export async function listAllOrders(filters: OrderFilters) { const { data } = await apiClient.get<ApiResponse<PaginatedOrders>>('/orders', { params: filters }); return data.data; }
export async function getOrder(id: string) { const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`); return data.data; }
export async function getOrderTimeline(id: string) { const { data } = await apiClient.get<ApiResponse<StatusHistory[]>>(`/orders/${id}/timeline`); return data.data; }
export async function updateOrderStatus(id: string, status: OrderStatus, notes?: string) { const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status, ...(notes ? { notes } : {}) }); return data.data; }
export async function rescheduleOrder(id: string, newDate: string) { const { data } = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/reschedule`, { newDate }); return data.data; }
export async function assignOrder(id: string, agentId: string) { const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/assign`, { agentId }); return data.data; }
export async function autoAssignOrder(id: string) { const { data } = await apiClient.post<ApiResponse<Agent | null>>(`/orders/${id}/auto-assign`); return { result: data.data, message: data.message }; }
export async function overrideOrderStatus(id: string, status: OrderStatus, notes?: string) { const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/override`, { status, ...(notes ? { notes } : {}) }); return data.data; }
export async function listAvailableAgents(zoneId?: string) { const { data } = await apiClient.get<ApiResponse<Agent[]>>('/agents/available', { params: zoneId ? { zoneId } : undefined }); return data.data; }

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['assigned', 'cancelled'], assigned: ['picked_up', 'cancelled'], picked_up: ['in_transit'], in_transit: ['out_for_delivery'], out_for_delivery: ['delivered', 'failed'], failed: ['rescheduled'], rescheduled: ['assigned'], delivered: [], cancelled: [],
};

export const ORDER_STATUSES: OrderStatus[] = ['created', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'rescheduled', 'cancelled'];
export const formatStatus = (status: OrderStatus) => status.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
