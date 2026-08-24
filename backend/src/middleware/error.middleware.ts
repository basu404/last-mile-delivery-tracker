import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.flatten(),
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'body' in error
  ) {
    response.status(400).json({ success: false, message: 'Invalid JSON request body' });
    return;
  }

  if (
    error &&
    typeof error === 'object' &&
    (('code' in error && error.code === 'P1001') ||
      ('errorCode' in error && error.errorCode === 'P1001'))
  ) {
    response.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable. Please retry shortly.',
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  response.status(500).json({ success: false, message });
};
