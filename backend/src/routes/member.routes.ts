import { Router } from "express";
import * as memberController from "../controllers/member.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/role.js";
import {
  inviteMemberSchema,
  updateMemberSchema,
  acceptInviteSchema,
} from "../validators/member.validators.js";

const router = Router();

// All routes require auth + PROVIDER role
router.use(authenticate);
router.use(requireRole("PROVIDER"));

// List team members
router.get("/", memberController.listMembers);

// Invite new member
router.post(
  "/invite",
  validate(inviteMemberSchema),
  memberController.inviteMember,
);

// Accept invite (for employees who registered and see a pending invite)
router.post(
  "/accept",
  validate(acceptInviteSchema),
  memberController.acceptInvite,
);

// Get pending invites for the current user
router.get("/invites/pending", memberController.getPendingInvites);

// Upgrade SOLO → COMPANY
router.post("/upgrade-company", memberController.upgradeToCompany);

// Update member (role, displayName)
router.patch(
  "/:memberId",
  validate(updateMemberSchema),
  memberController.updateMember,
);

// Deactivate member
router.delete("/:memberId", memberController.deactivateMember);

export default router;
