import type { Role } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload === 'string' ||
    typeof payload.userId !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Invalid token payload');
  }

  return { userId: payload.userId, role: payload.role as Role };
}
