import { Router } from "express";
import * as providerController from "../controllers/provider.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/role.js";
import {
  createProviderSchema,
  updateProviderSchema,
  addServiceSchema,
  updateServiceSchema,
  setAvailabilitySchema,
  updatePricingSettingsSchema,
  providerSearchSchema,
} from "../validators/provider.validators.js";

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Search / Discovery
router.get(
  "/search",
  validate(providerSearchSchema, "query"),
  providerController.searchProviders,
);

// ============================================================================
// AUTHENTICATED PROVIDER ROUTES
// ============================================================================

// Create provider profile (onboarding)
router.post(
  "/",
  authenticate,
  validate(createProviderSchema),
  providerController.createProvider,
);

// Get own provider profile (both PROVIDER owner and EMPLOYEE)
router.get(
  "/me/profile",
  authenticate,
  requireRole("PROVIDER", "EMPLOYEE"),
  providerController.getMyProvider,
);

// Update own provider profile (PROVIDER owner only)
router.patch(
  "/me/profile",
  authenticate,
  requireRole("PROVIDER"),
  validate(updateProviderSchema),
  providerController.updateProvider,
);

// Services CRUD
router.post(
  "/me/services",
  authenticate,
  requireRole("PROVIDER"),
  validate(addServiceSchema),
  providerController.addService,
);

router.patch(
  "/me/services/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  validate(updateServiceSchema),
  providerController.updateService,
);

router.delete(
  "/me/services/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  providerController.deleteService,
);

// Availability
router.put(
  "/me/availability",
  authenticate,
  requireRole("PROVIDER"),
  validate(setAvailabilitySchema),
  providerController.setAvailability,
);

// Pricing settings
router.patch(
  "/me/pricing",
  authenticate,
  requireRole("PROVIDER"),
  validate(updatePricingSettingsSchema),
  providerController.updatePricingSettings,
);

// Stats & Clients
router.get(
  "/me/stats",
  authenticate,
  requireRole("PROVIDER", "EMPLOYEE"),
  providerController.getStats,
);

router.get(
  "/me/clients",
  authenticate,
  requireRole("PROVIDER"),
  providerController.getClients,
);

// ============================================================================
// PUBLIC PROVIDER BY ID (must be AFTER /me routes)
// ============================================================================
router.get("/:id", providerController.getProviderById);

export default router;
