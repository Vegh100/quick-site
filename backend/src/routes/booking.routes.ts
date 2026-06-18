import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/role.js";
import {
  availableSlotsQuerySchema,
  createBookingSchema,
  updateBookingStatusSchema,
  bookingFilterSchema,
} from "../validators/booking.validators.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/bookings/available-slots:
 *   get:
 *     tags: [Bookings]
 *     summary: Get available time slots for a service
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: List of available time slots }
 */
router.get(
  "/available-slots",
  validate(availableSlotsQuerySchema, "query"),
  bookingController.getAvailableSlots,
);

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a new booking
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, providerId, scheduledDate, startTime]
 *             properties:
 *               serviceId: { type: string, format: uuid }
 *               providerId: { type: string, format: uuid }
 *               scheduledDate: { type: string, format: date }
 *               startTime: { type: string, example: "09:00" }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Booking created }
 *       400: { description: Validation error or slot unavailable }
 */
router.post(
  "/",
  requireRole("CUSTOMER"),
  validate(createBookingSchema),
  bookingController.createBooking,
);

/**
 * @openapi
 * /api/bookings/customer:
 *   get:
 *     tags: [Bookings]
 *     summary: Get bookings for the current customer
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200: { description: Paginated list of customer bookings }
 */
router.get(
  "/customer",
  requireRole("CUSTOMER"),
  validate(bookingFilterSchema, "query"),
  bookingController.getCustomerBookings,
);

/**
 * @openapi
 * /api/bookings/provider:
 *   get:
 *     tags: [Bookings]
 *     summary: Get bookings for the current provider
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of provider bookings }
 */
router.get(
  "/provider",
  requireRole("PROVIDER", "EMPLOYEE"),
  validate(bookingFilterSchema, "query"),
  bookingController.getProviderBookings,
);

/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get a single booking by ID
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking details }
 *       404: { description: Booking not found }
 */
router.get("/:id", bookingController.getBookingById);

/**
 * @openapi
 * /api/bookings/{id}/status:
 *   patch:
 *     tags: [Bookings]
 *     summary: Update booking status
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [CONFIRMED, CANCELLED, COMPLETED, NO_SHOW] }
 *     responses:
 *       200: { description: Booking status updated }
 */
router.patch(
  "/:id/status",
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

// Get booking activity timeline
router.get("/:id/timeline", bookingController.getBookingTimeline);

export default router;
