import { env } from "./env.config.js";

const isDev = env.NODE_ENV !== "production";

export const authConfig = {
  jwt: {
    secret:
      env.JWT_SECRET ||
      (isDev
        ? "dev-jwt-secret-change-in-production"
        : (() => {
            throw new Error("JWT_SECRET is required in production");
          })()),
    expiresIn: env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256" as const,
  },
  cookie: {
    name: "qvick_session",
    secret:
      env.COOKIE_SECRET ||
      (isDev
        ? "dev-cookie-secret-change-in-production"
        : (() => {
            throw new Error("COOKIE_SECRET is required in production");
          })()),
    options: {
      httpOnly: true,
      secure: !isDev,
      sameSite: (!isDev ? "strict" : "lax") as "strict" | "lax" | "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    },
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  session: {
    maxActive: 5,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
  password: {
    saltRounds: 12,
    minLength: 8,
  },
};
