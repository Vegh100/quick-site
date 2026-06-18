import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // Server
  APP_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT & Cookie (required in production)
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECRET: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).optional(),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  // Upload
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default(""),
  R2_PUBLIC_URL: z.string().default(""),

  // Email (SMTP)
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM_NAME: z.string().default("Qvick"),
  SMTP_FROM_EMAIL: z.string().default(""),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  const env = result.data;

  // Enforce secrets in production
  if (env.NODE_ENV === "production") {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be set and at least 32 characters in production");
    }
    if (!env.COOKIE_SECRET || env.COOKIE_SECRET.length < 32) {
      throw new Error("COOKIE_SECRET must be set and at least 32 characters in production");
    }
  }

  return env;
}

export const env = validateEnv();
