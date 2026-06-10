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

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post("/register", validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, sets session cookie }
 *       401: { description: Invalid credentials }
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with Google OAuth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string }
 *     responses:
 *       200: { description: Authentication successful }
 */
router.post("/google", validate(googleAuthSchema), authController.googleAuth);

router.post(
  "/register-from-invite/:token",
  validate(registerFromInviteSchema),
  authController.registerFromInvite,
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Current user data }
 *       401: { description: Not authenticated }
 */
router.get("/me", authenticate, authController.me);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email address with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
router.post("/verify-email", authController.verifyEmail);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Verification email sent }
 *       400: { description: Already verified }
 */
router.post("/resend-verification", authenticate, authController.resendVerification);

export default router;
