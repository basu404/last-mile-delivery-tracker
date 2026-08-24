import { apiClient, type ApiResponse, type User } from './client';

export interface AuthResult {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'customer';
  phone?: string;
}

export async function loginRequest(email: string, password: string) {
  const response = await apiClient.post<ApiResponse<AuthResult>>('/auth/login', { email, password });
  return response.data.data;
}

export async function registerRequest(input: RegisterInput) {
  const response = await apiClient.post<ApiResponse<AuthResult>>('/auth/register', input);
  return response.data.data;
}
