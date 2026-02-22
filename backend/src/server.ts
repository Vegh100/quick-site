import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./lib/prisma.js";
import { AppError } from "./lib/errors.js";
import { uploadConfig } from "./config/upload.config.js";
import { authConfig } from "./config/auth.config.js";
import { verifyEmailConnection } from "./services/email.service.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import memberRoutes from "./routes/member.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import categoryRoutes from "./routes/category.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;

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
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================================
// STATIC FILES (uploads)
// ============================================================================

app.use(uploadConfig.urlPrefix, express.static(uploadConfig.baseDir));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
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
  console.error("Error:", err.message);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
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
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Qvick API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
  );

  // Verify email service
  verifyEmailConnection();

  // Security warnings
  if (!process.env.JWT_SECRET) {
    console.warn(
      "JWT_SECRET is not set – using insecure dev default. Set it in .env for production!",
    );
  }
  if (!process.env.COOKIE_SECRET) {
    console.warn(
      "COOKIE_SECRET is not set – using insecure dev default. Set it in .env for production!",
    );
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
