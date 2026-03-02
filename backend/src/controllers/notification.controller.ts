import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import * as notificationService from "../services/notification.service.js";

/**
 * GET /api/notifications
 */
export async function getNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getUserNotifications(
      req.user!.userId,
      page,
      limit,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await notificationService.markAsRead(req.user!.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await notificationService.deleteNotification(
      req.user!.userId,
      req.params.id,
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/notifications
 */
export async function clearAllNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await notificationService.clearAllNotifications(req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
