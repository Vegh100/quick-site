import { describe, it, expect } from "vitest";
import { z } from "zod";

// Import the validators to test
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../../src/validators/auth.validators.js";

describe("auth validators", () => {
  describe("registerSchema", () => {
    it("accepts valid registration data", () => {
      const data = {
        email: "test@example.com",
        password: "StrongPass1",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(true);
    });

    it("rejects password without uppercase", () => {
      const data = {
        email: "test@example.com",
        password: "weakpass1",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(false);
    });

    it("rejects password without number", () => {
      const data = {
        email: "test@example.com",
        password: "WeakPasswordNoNumber",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(false);
    });

    it("rejects password shorter than 8 chars", () => {
      const data = {
        email: "test@example.com",
        password: "Ab1",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(false);
    });

    it("rejects password longer than 128 chars", () => {
      const data = {
        email: "test@example.com",
        password: "A1" + "a".repeat(127),
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(false);
    });

    it("rejects invalid email", () => {
      const data = {
        email: "not-an-email",
        password: "StrongPass1",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      };
      expect(registerSchema.safeParse(data).success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login data", () => {
      const data = { email: "test@example.com", password: "anyPassword" };
      expect(loginSchema.safeParse(data).success).toBe(true);
    });

    it("rejects missing email", () => {
      const data = { password: "anyPassword" };
      expect(loginSchema.safeParse(data).success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts valid password change", () => {
      const data = {
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
      };
      expect(changePasswordSchema.safeParse(data).success).toBe(true);
    });

    it("rejects weak new password", () => {
      const data = {
        currentPassword: "OldPass123",
        newPassword: "weak",
      };
      expect(changePasswordSchema.safeParse(data).success).toBe(false);
    });
  });
});
