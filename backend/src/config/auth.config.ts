import dotenv from "dotenv";
dotenv.config();

export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
    expiresIn: "7d",
    algorithm: "HS256" as const,
  },
  cookie: {
    name: "qvick_session",
    secret:
      process.env.COOKIE_SECRET || "dev-cookie-secret-change-in-production",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
        | "strict"
        | "lax"
        | "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    },
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
