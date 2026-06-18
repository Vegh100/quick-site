import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authConfig } from "../config/auth.config.js";

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (result.count > 0) {
      logger.info({ deleted: result.count }, "Expired sessions cleaned up");
    }
  } catch (err) {
    logger.error({ err }, "Session cleanup failed");
  }
}

export function startSessionCleanupJob(): void {
  cleanupTimer = setInterval(cleanupExpiredSessions, authConfig.session.cleanupInterval);
  logger.info("Session cleanup job started");
}

export function stopSessionCleanupJob(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info("Session cleanup job stopped");
  }
}
