import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.config.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Qvick API",
      version: "1.0.0",
      description: "Qvick booking platform REST API",
    },
    servers: [
      {
        url: `http://localhost:${env.APP_PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "qvick_session",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User management" },
      { name: "Providers", description: "Provider/business management" },
      { name: "Members", description: "Team member management" },
      { name: "Bookings", description: "Booking operations" },
      { name: "Reviews", description: "Review management" },
      { name: "Favorites", description: "Favorite providers" },
      { name: "Categories", description: "Service categories" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Messages", description: "Messaging system" },
      { name: "Portfolio", description: "Provider portfolio" },
      { name: "Referrals", description: "Referral system" },
      { name: "Export", description: "Data export" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
