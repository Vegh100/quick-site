import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
});

export const addAddressSchema = z.object({
  label: z.string().min(1).max(50),
  street: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  zipCode: z.string().min(1).max(20),
  country: z.string().length(2).default("RO"),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  formattedAddress: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = addAddressSchema.partial();

export const updateNotificationPrefsSchema = z.object({
  emailBookings: z.boolean().optional(),
  emailMessages: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  smsBookings: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type UpdateNotificationPrefsInput = z.infer<
  typeof updateNotificationPrefsSchema
>;
