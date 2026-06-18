import { Request, Response, NextFunction } from "express";
import * as bookingService from "../services/booking.service.js";
import * as bookingActivityService from "../services/booking-activity.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { providerId, serviceId, date, memberId } = req.query as {
      providerId: string;
      serviceId: string;
      date: string;
      memberId?: string;
    };

    if (!providerId || !serviceId || !date) {
      res.status(400).json({
        success: false,
        error: "providerId, serviceId, and date are required",
      });
      return;
    }

    const result = await bookingService.getAvailableSlots(providerId, serviceId, date, memberId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.createBooking(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const booking = await bookingService.updateBookingStatus(
      req.user!.userId,
      req.params.id,
      req.body,
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerBookings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await bookingService.getCustomerBookings(req.user!.userId, req.query as any);
    res.json({
      success: true,
      data: { bookings: result.bookings, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProviderBookings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await bookingService.getProviderBookings(req.user!.userId, req.query as any);
    res.json({
      success: true,
      data: { bookings: result.bookings, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBookingById(req.user!.userId, req.params.id);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function getBookingTimeline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    // Verify user has access to this booking
    await bookingService.getBookingById(req.user!.userId, req.params.id);
    const timeline = await bookingActivityService.getBookingTimeline(req.params.id);
    res.json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
}
