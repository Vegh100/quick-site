import { NotificationType } from "@prisma/client";
import prisma from "../lib/prisma.js";

// ============================================================================
// CREATE NOTIFICATION
// ============================================================================

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Create an in-app notification for a user.
 * Fire-and-forget — never throws.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  try {
    await prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body || null,
        link: params.link || null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", (error as Error).message);
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function createNotifications(
  params: CreateNotificationParams[],
): Promise<void> {
  try {
    await prisma.inAppNotification.createMany({
      data: params.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body || null,
        link: p.link || null,
      })),
    });
  } catch (error) {
    console.error(
      "Failed to create notifications:",
      (error as Error).message,
    );
  }
}

// ============================================================================
// QUERY NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for a user (paginated, newest first).
 */
export async function getUserNotifications(
  userId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inAppNotification.count({ where: { userId } }),
    prisma.inAppNotification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.inAppNotification.count({
    where: { userId, isRead: false },
  });
}

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Mark a single notification as read.
 */
export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.inAppNotification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.inAppNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// ============================================================================
// DELETE / CLEANUP
// ============================================================================

/**
 * Delete a single notification.
 */
export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.inAppNotification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * Delete all notifications for a user.
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  await prisma.inAppNotification.deleteMany({
    where: { userId },
  });
}
