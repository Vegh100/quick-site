import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM");

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    isEnabled: z.boolean().default(true),
    breakStart: timeSchema.optional().nullable(),
    breakEnd: timeSchema.optional().nullable(),
  })
  .superRefine((slot, ctx) => {
    if (!slot.isEnabled) return;

    const start = minutesFromTime(slot.startTime);
    const end = minutesFromTime(slot.endTime);
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time must be before end time",
        path: ["endTime"],
      });
    }

    const hasBreakStart = !!slot.breakStart;
    const hasBreakEnd = !!slot.breakEnd;
    if (hasBreakStart !== hasBreakEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Break start and end must be provided together",
        path: hasBreakStart ? ["breakEnd"] : ["breakStart"],
      });
      return;
    }

    if (slot.breakStart && slot.breakEnd) {
      const breakStart = minutesFromTime(slot.breakStart);
      const breakEnd = minutesFromTime(slot.breakEnd);
      if (breakStart >= breakEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Break start must be before break end",
          path: ["breakEnd"],
        });
      }
      if (breakStart < start || breakEnd > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Break must be within working hours",
          path: ["breakStart"],
        });
      }
    }
  });

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
  availability: z.array(availabilitySlotSchema),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AssignServiceInput = z.infer<typeof assignServiceSchema>;
export type SetMemberAvailabilityInput = z.infer<typeof setMemberAvailabilitySchema>;
