import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export type WebhookEvent =
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "review.created";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhook(
  deliveryId: string,
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Qvick-Signature": `sha256=${signature}`,
          "X-Qvick-Event": payload.event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "DELIVERED",
            attempts: attempt,
            responseCode: res.status,
            deliveredAt: new Date(),
          },
        });
        return;
      }

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts: attempt,
          responseCode: res.status,
          lastError: `HTTP ${res.status}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { attempts: attempt, lastError: message },
      });
    }

    // Exponential backoff: 2s, 4s
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: "FAILED" },
  });
}

export async function triggerWebhooks(
  providerId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      providerId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  for (const webhook of webhooks) {
    prisma.webhookDelivery
      .create({
        data: {
          webhookId: webhook.id,
          event,
          payload: payload as object,
          status: "PENDING",
        },
      })
      .then((delivery) =>
        deliverWebhook(delivery.id, webhook.id, webhook.url, webhook.secret, payload),
      )
      .catch((err) => logger.error({ err, webhookId: webhook.id }, "Webhook delivery failed"));
  }
}
