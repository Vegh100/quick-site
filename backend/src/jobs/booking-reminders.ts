import prisma from "../lib/prisma.js";
import { sendBookingReminderEmail } from "../services/email.service.js";

// ============================================================================
// BOOKING REMINDER JOB
// Runs every hour, sends reminder emails for bookings happening tomorrow
// that have CONFIRMED status and haven't been reminded yet.
// ============================================================================

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let reminderTimer: ReturnType<typeof setInterval> | null = null;

// Track which bookings have already been reminded (in-memory, resets on restart)
const remindedBookings = new Set<string>();

export async function sendBookingReminders(): Promise<void> {
  try {
    // Calculate tomorrow's date range (start of day to end of day)
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find all confirmed bookings for tomorrow
    const bookings = await prisma.booking.findMany({
      where: {
        scheduledDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
        status: "CONFIRMED",
      },
      include: {
        customer: {
          select: { email: true, firstName: true, lastName: true },
        },
        provider: {
          select: { businessName: true },
        },
        service: {
          select: { name: true, priceCurrency: true },
        },
      },
    });

    // Filter out already-reminded bookings
    const unreminded = bookings.filter((b) => !remindedBookings.has(b.id));

    if (unreminded.length === 0) return;

    console.log(
      `Sending ${unreminded.length} booking reminder(s) for tomorrow...`,
    );

    const HUNGARIAN_MONTHS = [
      "január", "február", "március", "április", "május", "június",
      "július", "augusztus", "szeptember", "október", "november", "december",
    ];

    for (const booking of unreminded) {
      const customerName =
        [booking.customer.firstName, booking.customer.lastName]
          .filter(Boolean)
          .join(" ") || "Ügyfél";

      const scheduledDate = new Date(booking.scheduledDate);
      const formattedDate = `${scheduledDate.getFullYear()}. ${HUNGARIAN_MONTHS[scheduledDate.getMonth()]} ${scheduledDate.getDate()}.`;

      const totalAmount = `${parseFloat(booking.totalAmount.toString()).toLocaleString("hu-HU")} ${booking.currency}`;

      await sendBookingReminderEmail({
        customerEmail: booking.customer.email,
        customerName,
        businessName: booking.provider.businessName,
        serviceName: booking.service.name,
        scheduledDate: formattedDate,
        scheduledTime: booking.scheduledTime,
        duration: booking.durationMin,
        totalAmount,
        bookingId: booking.id,
      });

      remindedBookings.add(booking.id);
    }

    // Clean up old reminded IDs to prevent memory leak (keep last 500)
    if (remindedBookings.size > 1000) {
      const entries = Array.from(remindedBookings);
      const toRemove = entries.slice(0, entries.length - 500);
      for (const id of toRemove) {
        remindedBookings.delete(id);
      }
    }
  } catch (error) {
    console.error("Booking reminder job error:", (error as Error).message);
  }
}

/**
 * Start the periodic reminder job.
 * Runs every hour.
 */
export function startBookingReminderJob(): void {
  // Run once on startup (after a short delay to let the server finish starting)
  setTimeout(() => {
    sendBookingReminders();
  }, 10_000);

  // Then run every hour
  reminderTimer = setInterval(sendBookingReminders, REMINDER_INTERVAL_MS);
  console.log("Booking reminder job started (runs every hour)");
}

/**
 * Stop the periodic reminder job (for graceful shutdown).
 */
export function stopBookingReminderJob(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
    console.log("Booking reminder job stopped");
  }
}
