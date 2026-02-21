import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/role.js";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingFilterSchema,
} from "../validators/booking.validators.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get available time slots for a service (any authenticated user)
router.get("/available-slots", bookingController.getAvailableSlots);

// Create booking (customers only)
router.post(
  "/",
  requireRole("CUSTOMER"),
  validate(createBookingSchema),
  bookingController.createBooking,
);

// Get bookings (customer view)
router.get(
  "/customer",
  requireRole("CUSTOMER"),
  validate(bookingFilterSchema, "query"),
  bookingController.getCustomerBookings,
);

// Get bookings (provider view — both PROVIDER owner and EMPLOYEE)
router.get(
  "/provider",
  requireRole("PROVIDER", "EMPLOYEE"),
  validate(bookingFilterSchema, "query"),
  bookingController.getProviderBookings,
);

// Get single booking
router.get("/:id", bookingController.getBookingById);

// Update booking status
router.patch(
  "/:id/status",
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

export default router;
