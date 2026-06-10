import prisma from "./prisma.js";
import { logger } from "./logger.js";
import { Prisma } from "@prisma/client";

interface AuditEntry {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    logger.error({ err, ...entry }, "Failed to write audit log");
  }
}
