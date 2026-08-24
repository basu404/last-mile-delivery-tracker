import type { Response } from 'express';

export function sendSuccess<T>(
  response: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void {
  response.status(statusCode).json({ success: true, ...(message ? { message } : {}), data });
}
