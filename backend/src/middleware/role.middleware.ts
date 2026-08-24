import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './error.middleware';

export function requireRole(allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
