import { apiClient, type ApiResponse } from './client';
import type { Agent, ZoneRef } from './orders.api';

export interface AdminAgent extends Agent {
  createdAt: string;
  assignedZone?: ZoneRef | null;
}

export interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  assignedZoneId: string;
}

export async function listAgents(zoneId?: string) {
  const { data } = await apiClient.get<ApiResponse<AdminAgent[]>>('/agents', {
    params: zoneId ? { zoneId } : undefined,
  });
  return data.data;
}

export async function createAgent(input: CreateAgentInput) {
  const { data } = await apiClient.post<ApiResponse<AdminAgent>>('/agents', input);
  return data.data;
}
