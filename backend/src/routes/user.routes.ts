import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uploadAvatar } from "../lib/upload.js";
import {
  updateProfileSchema,
  addAddressSchema,
  updateAddressSchema,
  updateNotificationPrefsSchema,
} from "../validators/user.validators.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get("/profile", userController.getProfile);
router.patch(
  "/profile",
  validate(updateProfileSchema),
  userController.updateProfile,
);
router.post("/profile/avatar", uploadAvatar, userController.uploadAvatar);

// Addresses
router.get("/addresses", userController.getAddresses);
router.post(
  "/addresses",
  validate(addAddressSchema),
  userController.addAddress,
);
router.patch(
  "/addresses/:addressId",
  validate(updateAddressSchema),
  userController.updateAddress,
);
router.delete("/addresses/:addressId", userController.deleteAddress);

// Notification preferences
router.get("/notifications", userController.getNotificationPrefs);
router.patch(
  "/notifications",
  validate(updateNotificationPrefsSchema),
  userController.updateNotificationPrefs,
);

export default router;
