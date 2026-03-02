import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import * as exportController from "../controllers/export.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("PROVIDER", "EMPLOYEE"));

router.get("/bookings/csv", exportController.exportBookingsCsv);
router.get("/revenue-summary", exportController.getRevenueSummary);

export default router;
