import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email("Érvényes e-mail cím szükséges"),
  role: z.enum(["MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  displayName: z.string().min(1).max(200).optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(["MANAGER", "EMPLOYEE"]).optional(),
  displayName: z.string().min(1).max(200).optional(),
});

export const acceptInviteSchema = z.object({
  memberId: z.string().uuid(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
