import { Router } from "express";
import * as memberController from "../controllers/member.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/role.js";
import {
  inviteMemberSchema,
  updateMemberSchema,
  assignServiceSchema,
  setMemberAvailabilitySchema,
} from "../validators/member.validators.js";

const router = Router();

// All routes require auth + PROVIDER role (only owners manage team)
router.use(authenticate);
router.use(requireRole("PROVIDER"));

// List team members
router.get("/", memberController.listMembers);

// Invite new member (generates invite token)
router.post("/invite", validate(inviteMemberSchema), memberController.inviteMember);

// Get pending invites for the current user
router.get("/invites/pending", memberController.getPendingInvites);

// Get detailed member info (services, availability, booking stats)
router.get("/:memberId/detail", memberController.getMemberDetail);

// Update member (displayName)
router.patch("/:memberId", validate(updateMemberSchema), memberController.updateMember);

// Deactivate member
router.delete("/:memberId", memberController.deactivateMember);

// Assign/remove service to/from member
router.post("/:memberId/services", validate(assignServiceSchema), memberController.assignService);
router.delete("/:memberId/services/:serviceId", memberController.removeService);

// Set member availability/schedule
router.put(
  "/:memberId/availability",
  validate(setMemberAvailabilitySchema),
  memberController.setMemberAvailability,
);

export default router;
