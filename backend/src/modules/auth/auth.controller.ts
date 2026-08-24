import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/apiResponse';
import * as authService from './auth.service';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  role: z.literal('customer').default('customer'),
  phone: z.string().trim().min(7).max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function register(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await authService.register(registerSchema.parse(request.body));
    sendSuccess(response, result, 201, 'Registration successful');
  } catch (error) {
    next(error);
  }
}

export async function login(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await authService.login(loginSchema.parse(request.body));
    sendSuccess(response, result, 200, 'Login successful');
  } catch (error) {
    next(error);
  }
}
