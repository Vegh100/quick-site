import Redis from "ioredis";
import { env } from "../config/env.config.js";
import { logger } from "./logger.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

export default redis;
