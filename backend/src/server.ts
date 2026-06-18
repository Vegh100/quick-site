import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./lib/prisma.js";
import redis from "./lib/redis.js";
import { AppError } from "./lib/errors.js";
import { uploadConfig } from "./config/upload.config.js";
import { env } from "./config/env.config.js";
import { authConfig } from "./config/auth.config.js";
import { swaggerSpec } from "./config/swagger.js";
import swaggerUi from "swagger-ui-express";
import { verifyEmailConnection } from "./services/email.service.js";
import { startBookingReminderJob, stopBookingReminderJob } from "./jobs/booking-reminders.js";
import { startSessionCleanupJob, stopSessionCleanupJob } from "./jobs/session-cleanup.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import memberRoutes from "./routes/member.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import messagingRoutes from "./routes/messaging.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import exportRoutes from "./routes/export.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = env.APP_PORT;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(pinoHttp({ logger }));

// Rate limiting
const isDev = env.NODE_ENV !== "production";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/me", // Don't count session checks
  message: {
    success: false,
    error: "Too many auth attempts, please try again later.",
  },
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);

// ============================================================================
// BODY PARSING & COOKIES
// ============================================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================================
// STATIC FILES (uploads)
// ============================================================================

// ============================================================================
// API DOCS
// ============================================================================

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const mem = process.memoryUsage();
  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    },
    checks,
  });
});

app.get("/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/providers/me/members", memberRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/export", exportRoutes);

// Public invite info endpoint (no auth required)
import * as memberController from "./controllers/member.controller.js";
app.get("/api/invites/:token", memberController.getInviteInfo as any);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");

  if (env.NODE_ENV === "development") {
    logger.error(err.stack);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Multer errors
  if (err.message?.includes("File too large")) {
    res.status(400).json({
      success: false,
      error: "File too large. Maximum size is 5MB.",
    });
    return;
  }

  // Prisma errors
  if ((err as any).code === "P2002") {
    res.status(409).json({
      success: false,
      error: "A record with this value already exists.",
    });
    return;
  }

  if ((err as any).code === "P2025") {
    res.status(404).json({
      success: false,
      error: "Record not found.",
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Qvick API running");
  logger.info({ environment: env.NODE_ENV }, "Environment");
  logger.info({ frontendUrl: env.FRONTEND_URL }, "Frontend URL");

  // Connect Redis (lazy, non-blocking)
  redis.connect().catch((err) => {
    logger.warn({ err }, "Redis connection failed — caching disabled");
  });

  // Verify email service
  verifyEmailConnection();

  // Start background jobs
  startBookingReminderJob();
  startSessionCleanupJob();

  // Security warnings
  if (!env.JWT_SECRET) {
    logger.warn(
      "JWT_SECRET is not set – using insecure dev default. Set it in .env for production!",
    );
  }
  if (!env.COOKIE_SECRET) {
    logger.warn(
      "COOKIE_SECRET is not set – using insecure dev default. Set it in .env for production!",
    );
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully...");
  stopBookingReminderJob();
  stopSessionCleanupJob();
  await redis.quit().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
