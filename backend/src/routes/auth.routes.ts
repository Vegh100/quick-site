import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  changePasswordSchema,
  registerFromInviteSchema,
} from "../validators/auth.validators.js";

const router = Router();

// Public
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/google", validate(googleAuthSchema), authController.googleAuth);
router.post(
  "/register-from-invite/:token",
  validate(registerFromInviteSchema),
  authController.registerFromInvite,
);

// Authenticated
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
