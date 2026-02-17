import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError, AppError } from "../lib/errors.js";
import {
  CreateReviewInput,
  ReviewFilterInput,
} from "../validators/review.validators.js";

// ============================================================================
// CREATE REVIEW
// ============================================================================

export async function createReview(authorId: string, data: CreateReviewInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { provider: true },
  });

  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "COMPLETED") {
    throw new AppError("Can only review completed bookings", 400);
  }

  // Determine target: customer reviews provider, provider reviews customer
  const isCustomer = booking.customerId === authorId;
  const isProvider = booking.provider.userId === authorId;

  if (!isCustomer && !isProvider) {
    throw new ForbiddenError("Not a participant of this booking");
  }

  // Target is the other party's user ID
  const targetId = isCustomer ? booking.provider.userId : booking.customerId;

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: {
      bookingId_authorId: { bookingId: data.bookingId, authorId },
    },
  });

  if (existingReview) {
    throw new AppError("You have already reviewed this booking", 409);
  }

  const review = await prisma.review.create({
    data: {
      bookingId: data.bookingId,
      authorId,
      targetId,
      rating: data.rating,
      comment: data.comment,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  // If reviewing a provider, update their aggregate rating
  if (isCustomer) {
    await updateProviderRating(booking.providerId);
  }

  return review;
}

// ============================================================================
// GET REVIEWS
// ============================================================================

export async function getProviderReviews(
  providerId: string,
  filters: ReviewFilterInput,
) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  if (!provider) throw new NotFoundError("Provider");

  const where: {
    targetId: string;
    rating?: { gte: number };
  } = { targetId: provider.userId };

  if (filters.minRating) {
    where.rating = { gte: filters.minRating };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        booking: {
          select: { service: { select: { name: true } }, scheduledDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getUserReviews(
  userId: string,
  type: "given" | "received",
  filters: ReviewFilterInput,
) {
  const where: {
    authorId?: string;
    targetId?: string;
    rating?: { gte: number };
  } = type === "given" ? { authorId: userId } : { targetId: userId };

  if (filters.minRating) {
    where.rating = { gte: filters.minRating };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        booking: {
          select: { service: { select: { name: true } }, scheduledDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function updateProviderRating(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  if (!provider) return;

  const result = await prisma.review.aggregate({
    where: { targetId: provider.userId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      rating: result._avg.rating || 0,
      reviewCount: result._count.rating,
    },
  });
}
