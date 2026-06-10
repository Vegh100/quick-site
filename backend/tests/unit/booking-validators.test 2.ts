import { describe, it, expect } from "vitest";
import {
  availableSlotsQuerySchema,
  bookingFilterSchema,
} from "../../src/validators/booking.validators.js";

describe("booking validators", () => {
  describe("availableSlotsQuerySchema", () => {
    it("accepts valid query params", () => {
      const data = {
        providerId: "550e8400-e29b-41d4-a716-446655440000",
        serviceId: "550e8400-e29b-41d4-a716-446655440001",
        date: "2025-03-15",
      };
      expect(availableSlotsQuerySchema.safeParse(data).success).toBe(true);
    });

    it("rejects non-UUID providerId", () => {
      const data = {
        providerId: "not-a-uuid",
        serviceId: "550e8400-e29b-41d4-a716-446655440001",
        date: "2025-03-15",
      };
      expect(availableSlotsQuerySchema.safeParse(data).success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const data = {
        providerId: "550e8400-e29b-41d4-a716-446655440000",
        serviceId: "550e8400-e29b-41d4-a716-446655440001",
        date: "15/03/2025",
      };
      expect(availableSlotsQuerySchema.safeParse(data).success).toBe(false);
    });
  });

  describe("bookingFilterSchema", () => {
    it("defaults page to 1 and limit to 10", () => {
      const result = bookingFilterSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("caps limit at 50", () => {
      const result = bookingFilterSchema.safeParse({ limit: 100 });
      expect(result.success).toBe(false);
    });

    it("accepts valid filters", () => {
      const data = {
        status: "PENDING",
        page: 2,
        limit: 20,
        dateFrom: "2025-01-01",
      };
      const result = bookingFilterSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
