import { describe, it, expect } from "vitest";
import { formatDateHu, formatAmount, MONTHS, DAY_NAMES } from "../../src/lib/locale.js";

describe("locale helpers", () => {
  describe("MONTHS", () => {
    it("has 12 months", () => {
      expect(MONTHS).toHaveLength(12);
    });
    it("starts with január", () => {
      expect(MONTHS[0]).toBe("január");
    });
  });

  describe("DAY_NAMES", () => {
    it("has 7 days", () => {
      expect(DAY_NAMES).toHaveLength(7);
    });
    it("starts with Vasárnap (Sunday)", () => {
      expect(DAY_NAMES[0]).toBe("Vasárnap");
    });
  });

  describe("formatDateHu", () => {
    it("formats a date in Hungarian style", () => {
      // 2024-03-15 → "2024. március 15."
      const date = new Date(2024, 2, 15); // month is 0-indexed
      expect(formatDateHu(date)).toBe("2024. március 15.");
    });

    it("handles January correctly", () => {
      const date = new Date(2025, 0, 1);
      expect(formatDateHu(date)).toBe("2025. január 1.");
    });

    it("handles December correctly", () => {
      const date = new Date(2025, 11, 31);
      expect(formatDateHu(date)).toBe("2025. december 31.");
    });
  });

  describe("formatAmount", () => {
    it("formats number with currency", () => {
      const result = formatAmount(15000, "RON");
      expect(result).toContain("15");
      expect(result).toContain("RON");
    });

    it("formats string amount", () => {
      const result = formatAmount("25000.50", "HUF");
      expect(result).toContain("25");
      expect(result).toContain("HUF");
    });

    it("defaults to RON currency", () => {
      const result = formatAmount(100);
      expect(result).toContain("RON");
    });
  });
});
