import { describe, it, expect } from "vitest";
import { cacheable, invalidateCache } from "../../src/lib/cache.js";

describe("cache helpers", () => {
  it("cacheable returns computed value on cache miss", async () => {
    const result = await cacheable("test:key", 60, async () => ({
      data: "computed",
    }));
    expect(result).toEqual({ data: "computed" });
  });

  it("invalidateCache does not throw", async () => {
    await expect(invalidateCache("some:key")).resolves.not.toThrow();
  });
});
