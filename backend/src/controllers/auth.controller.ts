import { Request, Response, NextFunction } from "express";
import { authConfig } from "../config/auth.config.js";
import * as authService from "../services/auth.service.js";
import { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";

function setSessionCookie(res: Response, token: string) {
  res.cookie(authConfig.cookie.name, token, authConfig.cookie.options);
}

function clearSessionCookie(res: Response) {
  res.clearCookie(authConfig.cookie.name, {
    httpOnly: true,
    secure: authConfig.cookie.options.secure,
    sameSite: authConfig.cookie.options.sameSite,
    path: "/",
  });
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.register(
      req.body,
      req.headers["user-agent"],
      req.ip,
    );

    setSessionCookie(res, result.token);

    res.status(201).json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(
      req.body,
      req.headers["user-agent"],
      req.ip,
    );

    setSessionCookie(res, result.token);

    res.json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.googleAuth(
      req.body.credential,
      req.body.role,
      req.headers["user-agent"],
      req.ip,
    );

    setSessionCookie(res, result.token);

    res.json({
      success: true,
      data: {
        user: result.user,
        isNewUser: result.isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (req.user?.sessionId) {
      await authService.logout(req.user.sessionId);
    }

    clearSessionCookie(res);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function logoutAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (req.user?.userId) {
      await authService.logoutAll(req.user.userId);
    }

    clearSessionCookie(res);

    res.json({ success: true, message: "Logged out from all devices" });
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.changePassword(
      req.user!.userId,
      req.body.currentPassword,
      req.body.newPassword,
    );

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
}

export async function registerFromInvite(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.registerFromInvite(
      req.params.token,
      req.body,
      req.headers["user-agent"],
      req.ip,
    );

    setSessionCookie(res, result.token);

    res.status(201).json({
      success: true,
      data: { user: result.user, provider: result.provider },
    });
  } catch (error) {
    next(error);
  }
}
