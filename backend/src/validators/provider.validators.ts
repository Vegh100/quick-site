import { z } from "zod";

export const createProviderSchema = z.object({
  businessName: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(500).optional().or(z.literal("")),
  serviceArea: z.string().max(500).optional(),
  taxNumber: z.string().max(50).optional(),
  regNumber: z.string().max(50).optional(),
  county: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
});

export const updateProviderSchema = createProviderSchema.partial();

export const addServiceSchema = z.object({
  serviceTypeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priceAmount: z.number().positive("Price must be positive"),
  priceType: z.enum(["PER_HOUR", "FIXED", "PER_SERVICE"]).default("FIXED"),
  durationMin: z.number().int().positive("Duration must be positive"),
  slotIntervalMin: z.number().int().min(15).max(480).default(60),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

export const updateServiceSchema = addServiceSchema.partial();

export const setAvailabilitySchema = z.object({
  memberId: z.string().uuid(),
  availability: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      isEnabled: z.boolean().default(true),
    }),
  ),
});

export const setServiceSlotsSchema = z.object({
  serviceId: z.string().uuid(),
  memberId: z.string().uuid(),
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
    }),
  ),
});

export const updatePricingSettingsSchema = z.object({
  dynamicPricing: z.boolean().optional(),
  weekendPremium: z.boolean().optional(),
  weekendPremiumPercent: z.number().int().min(0).max(100).optional(),
  autoAccept: z.boolean().optional(),
});

export const serviceMatrixSchema = z.object({
  entries: z
    .array(
      z.object({
        templateKey: z.string().min(1).max(120),
        priceAmount: z.number().positive("Price must be positive"),
        durationMin: z
          .number()
          .int()
          .positive("Duration must be positive")
          .max(480, "Duration must be 480 minutes or less"),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1, "At least one matrix entry is required")
    .max(20, "Too many matrix entries"),
});

export const providerSearchSchema = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  serviceTypeId: z.string().uuid().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sortBy: z.enum(["rating", "price", "reviewCount", "createdAt", "newest"]).default("rating"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type AddServiceInput = z.infer<typeof addServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type SetServiceSlotsInput = z.infer<typeof setServiceSlotsSchema>;
export type UpdatePricingSettingsInput = z.infer<typeof updatePricingSettingsSchema>;
export type ServiceMatrixInput = z.infer<typeof serviceMatrixSchema>;
export type ProviderSearchInput = z.infer<typeof providerSearchSchema>;
