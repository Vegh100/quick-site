import prisma from "../lib/prisma.js";

// ============================================================================
// LOG BOOKING ACTIVITY
// ============================================================================

export async function logBookingActivity(data: {
  bookingId: string;
  action: string;
  performedBy?: string;
  note?: string;
}) {
  return prisma.bookingActivity.create({
    data: {
      bookingId: data.bookingId,
      action: data.action,
      performedBy: data.performedBy || null,
      note: data.note || null,
    },
  });
}

// ============================================================================
// GET BOOKING TIMELINE
// ============================================================================

export async function getBookingTimeline(bookingId: string) {
  return prisma.bookingActivity.findMany({
    where: { bookingId },
    include: {
      performer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
