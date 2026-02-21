import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email("Érvényes e-mail cím szükséges"),
  displayName: z.string().min(1).max(200).optional(),
});

export const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
});

export const assignServiceSchema = z.object({
  serviceId: z.string().uuid(),
});

export const setMemberAvailabilitySchema = z.object({
  availability: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
      isEnabled: z.boolean().default(true),
    }),
  ),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AssignServiceInput = z.infer<typeof assignServiceSchema>;
export type SetMemberAvailabilityInput = z.infer<
  typeof setMemberAvailabilitySchema
>;
