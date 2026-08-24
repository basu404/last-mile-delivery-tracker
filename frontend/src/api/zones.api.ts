import { apiClient, type ApiResponse } from './client';

export interface Zone { id: string; name: string; pincodeCount: number; createdAt: string }
export interface ZonePincode { id: string; pincode: string }
export interface ZonePincodeList { id: string; name: string; pincodes: ZonePincode[] }
export interface UpdatePincodeInput { newZoneId?: string; pincode?: string }

export async function listZones() { const { data } = await apiClient.get<ApiResponse<Zone[]>>('/zones'); return data.data; }
export async function listZonePincodes(zoneId: string) { const { data } = await apiClient.get<ApiResponse<ZonePincodeList>>(`/zones/${zoneId}/pincodes`); return data.data; }
export async function createZone(name: string) { const { data } = await apiClient.post<ApiResponse<Zone>>('/zones', { name }); return data.data; }
export async function addPincodes(zoneId: string, pincodes: string[]) { const { data } = await apiClient.post<ApiResponse<Zone & { pincodes: ZonePincode[] }>>(`/zones/${zoneId}/pincodes`, { pincodes }); return data.data; }
export async function removePincode(zoneId: string, pincodeId: string) { const { data } = await apiClient.delete<ApiResponse<ZonePincode & { zoneId: string }>>(`/zones/${zoneId}/pincodes/${pincodeId}`); return data.data; }
export async function updatePincode(zoneId: string, pincodeId: string, input: UpdatePincodeInput) { const { data } = await apiClient.patch<ApiResponse<ZonePincode & { zoneId: string }>>(`/zones/${zoneId}/pincodes/${pincodeId}`, input); return data.data; }
