import { apiClient, type ApiResponse } from './client';
import type { OrderType } from './orders.api';

export interface RateCard {
  id: string; orderType: OrderType; fromZoneId: string; toZoneId: string; rateType: 'intra_zone' | 'inter_zone'; basePrice: number; pricePerKg: number; codSurchargeFlat: number; codSurchargePct: number; isActive: boolean; createdAt: string; fromZone: { id: string; name: string }; toZone: { id: string; name: string };
}
export interface CreateRateCardInput { orderType: OrderType; fromZoneId: string; toZoneId: string; rateType: 'intra_zone' | 'inter_zone'; basePrice: number; pricePerKg: number; codSurchargeFlat: number; codSurchargePct: number }
export type UpdateRateCardInput = Partial<Pick<RateCard, 'basePrice' | 'pricePerKg' | 'codSurchargeFlat' | 'codSurchargePct' | 'isActive'>>;

export async function listRateCards() { const { data } = await apiClient.get<ApiResponse<RateCard[]>>('/rate-cards'); return data.data; }
export async function createRateCard(input: CreateRateCardInput) { const { data } = await apiClient.post<ApiResponse<RateCard>>('/rate-cards', input); return data.data; }
export async function updateRateCard(id: string, input: UpdateRateCardInput) { const { data } = await apiClient.patch<ApiResponse<RateCard>>(`/rate-cards/${id}`, input); return data.data; }
