// Global test setup — runs before all test suites
import { vi } from "vitest";

// Prevent actual Redis connections in tests
vi.mock("../src/lib/redis", () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue("OK"),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  },
}));
