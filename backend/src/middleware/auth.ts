import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.config.js";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest, AuthPayload } from "../types/index.js";
import { UnauthorizedError } from "../lib/errors.js";

function clearSessionCookie(res: Response) {
  res.clearCookie(authConfig.cookie.name, {
    httpOnly: true,
    secure: authConfig.cookie.options.secure,
    sameSite: authConfig.cookie.options.sameSite,
    path: "/",
  });
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[authConfig.cookie.name];

    if (!token) {
      throw new UnauthorizedError("No session token provided");
    }

    // Verify JWT with algorithm pinning to prevent confusion attacks
    const payload = jwt.verify(token, authConfig.jwt.secret, {
      algorithms: [authConfig.jwt.algorithm],
    }) as AuthPayload;

    // Check session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      // Clear the stale cookie so the browser stops sending it
      clearSessionCookie(res);
      throw new UnauthorizedError("Session expired");
    }

    if (!session.user.isActive) {
      clearSessionCookie(res);
      throw new UnauthorizedError("Account is deactivated");
    }

    req.user = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Invalid/tampered JWT — clear the bad cookie
      clearSessionCookie(res);
      next(new UnauthorizedError("Invalid session token"));
    } else {
      next(error);
    }
  }
}

// Optional auth - doesn't throw, just attaches user if token present
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[authConfig.cookie.name];
    if (!token) {
      return next();
    }

    const payload = jwt.verify(token, authConfig.jwt.secret, {
      algorithms: [authConfig.jwt.algorithm],
    }) as AuthPayload;
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date() && session.user.isActive) {
      req.user = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
      };
    }

    next();
  } catch {
    next();
  }
}
