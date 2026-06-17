import { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "../types/index.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(" or ")}`));
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  // Check admin flag separately (any role can be admin)
  // For simplicity we check role === ADMIN
  if (req.user.role !== "ADMIN") {
    return next(new ForbiddenError("Admin access required"));
  }

  next();
}
