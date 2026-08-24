import axios, { AxiosError } from 'axios';

export type Role = 'customer' | 'agent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  assignedZoneId?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const TOKEN_KEY = 'lastMileToken';
let accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; errors?: { formErrors?: string[] } } | undefined;
    return data?.message ?? data?.errors?.formErrors?.[0] ?? 'The request could not be completed.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
