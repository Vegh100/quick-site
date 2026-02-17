import { z } from "zod";

export const createProviderSchema = z.object({
  businessName: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(500).optional().or(z.literal("")),
  serviceArea: z.string().max(500).optional(),
  teamSize: z.string().max(20).optional(),
  taxNumber: z.string().max(50).optional(),
  regNumber: z.string().max(50).optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
});

export const updateProviderSchema = createProviderSchema.partial();

export const addServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priceAmount: z.number().positive("Price must be positive"),
  priceType: z.enum(["PER_HOUR", "FIXED", "PER_SERVICE"]).default("PER_HOUR"),
  durationMin: z.number().int().positive("Duration must be positive"),
});

export const updateServiceSchema = addServiceSchema.partial();

export const setAvailabilitySchema = z.object({
  availability: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      isEnabled: z.boolean().default(true),
    }),
  ),
});

export const updatePricingSettingsSchema = z.object({
  dynamicPricing: z.boolean().optional(),
  weekendPremium: z.boolean().optional(),
  weekendPremiumPercent: z.number().int().min(0).max(100).optional(),
  autoAccept: z.boolean().optional(),
});

export const providerSearchSchema = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sortBy: z
    .enum(["rating", "price", "reviewCount", "createdAt", "newest"])
    .default("rating"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type AddServiceInput = z.infer<typeof addServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type UpdatePricingSettingsInput = z.infer<
  typeof updatePricingSettingsSchema
>;
export type ProviderSearchInput = z.infer<typeof providerSearchSchema>;
