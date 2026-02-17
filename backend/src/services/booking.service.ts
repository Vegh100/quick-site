import { Prisma, BookingStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError, AppError } from "../lib/errors.js";
import { getProviderForUser } from "./member.service.js";
import {
  CreateBookingInput,
  UpdateBookingStatusInput,
  BookingFilterInput,
} from "../validators/booking.validators.js";

// ============================================================================
// CREATE BOOKING
// ============================================================================

export async function createBooking(
  customerId: string,
  data: CreateBookingInput,
) {
  // Verify provider exists
  const provider = await prisma.provider.findUnique({
    where: { id: data.providerId },
    include: { user: true },
  });
  if (!provider) throw new NotFoundError("Provider");

  // Cannot book own service
  if (provider.userId === customerId) {
    throw new AppError("Cannot book your own service", 400);
  }

  // Verify service exists and belongs to provider
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, providerId: data.providerId, isActive: true },
  });
  if (!service) throw new NotFoundError("Service");

  // Check availability
  const scheduledDate = new Date(data.scheduledDate);
  const dayOfWeek = scheduledDate.getDay();
  const availability = await prisma.availability.findUnique({
    where: {
      providerId_dayOfWeek: { providerId: data.providerId, dayOfWeek },
    },
  });

  if (!availability || !availability.isEnabled) {
    throw new AppError("Provider is not available on this day", 400);
  }

  if (
    data.scheduledTime < availability.startTime ||
    data.scheduledTime >= availability.endTime
  ) {
    throw new AppError("Selected time is outside provider availability", 400);
  }

  // Calculate total amount
  let totalAmount = Number(service.priceAmount);

  // Apply weekend premium if applicable
  if (provider.weekendPremium && (dayOfWeek === 0 || dayOfWeek === 6)) {
    totalAmount *= 1 + provider.weekendPremiumPercent / 100;
  }

  // Verify address if provided
  if (data.addressId) {
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId: customerId },
    });
    if (!address) throw new NotFoundError("Address");
  }

  // Verify assigned member if provided (COMPANY providers)
  if (data.assignedMemberId) {
    const member = await prisma.providerMember.findFirst({
      where: {
        id: data.assignedMemberId,
        providerId: data.providerId,
        status: "ACTIVE",
      },
    });
    if (!member) throw new NotFoundError("Team member");
  }

  const status = provider.autoAccept ? "CONFIRMED" : "PENDING";

  const booking = await prisma.booking.create({
    data: {
      customerId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      assignedMemberId: data.assignedMemberId || null,
      scheduledDate: new Date(data.scheduledDate),
      scheduledTime: data.scheduledTime,
      durationMin: service.durationMin,
      totalAmount: new Prisma.Decimal(totalAmount),
      notes: data.notes,
      addressId: data.addressId,
      status: status as BookingStatus,
    },
    include: {
      service: true,
      provider: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      assignedMember: {
        select: {
          id: true,
          displayName: true,
          role: true,
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
      address: true,
    },
  });

  return booking;
}

// ============================================================================
// UPDATE BOOKING STATUS
// ============================================================================

export async function updateBookingStatus(
  userId: string,
  bookingId: string,
  data: UpdateBookingStatusInput,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { provider: true },
  });
  if (!booking) throw new NotFoundError("Booking");

  // Verify user is participant
  const isCustomer = booking.customerId === userId;
  const isProvider = booking.provider.userId === userId;

  // Also check if user is a team member of this provider
  let isTeamMember = false;
  if (!isCustomer && !isProvider) {
    const membership = await prisma.providerMember.findFirst({
      where: {
        userId,
        providerId: booking.providerId,
        status: "ACTIVE",
      },
    });
    isTeamMember = !!membership;
  }

  if (!isCustomer && !isProvider && !isTeamMember) {
    throw new ForbiddenError("Not authorized to update this booking");
  }

  // Validate status transitions
  const allowedTransitions: Record<
    string,
    { customer: string[]; provider: string[] }
  > = {
    PENDING: { customer: ["CANCELLED"], provider: ["CONFIRMED", "CANCELLED"] },
    CONFIRMED: {
      customer: ["CANCELLED"],
      provider: ["IN_PROGRESS", "CANCELLED"],
    },
    IN_PROGRESS: { customer: [], provider: ["COMPLETED", "CANCELLED"] },
    COMPLETED: { customer: [], provider: [] },
    CANCELLED: { customer: [], provider: [] },
  };

  const role = isCustomer ? "customer" : "provider";
  const allowed = allowedTransitions[booking.status]?.[role] || [];

  if (!allowed.includes(data.status)) {
    throw new AppError(
      `Cannot transition from ${booking.status} to ${data.status} as ${role}`,
      400,
    );
  }

  const updateData: Prisma.BookingUpdateInput = {
    status: data.status as BookingStatus,
  };

  if (data.status === "CANCELLED") {
    updateData.cancelledBy = userId;
    updateData.cancelReason = data.cancelReason;
  }

  if (data.status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: {
      service: true,
      provider: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      customer: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      assignedMember: {
        select: {
          id: true,
          displayName: true,
          role: true,
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
      address: true,
    },
  });
}

// ============================================================================
// GET BOOKINGS
// ============================================================================

export async function getCustomerBookings(
  customerId: string,
  filters: BookingFilterInput,
) {
  const where: Prisma.BookingWhereInput = { customerId };

  if (filters.status) {
    const statuses = filters.status.split(",") as BookingStatus[];
    where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
  }
  if (filters.dateFrom) {
    where.scheduledDate = {
      ...((where.scheduledDate as object) || {}),
      gte: new Date(filters.dateFrom),
    };
  }
  if (filters.dateTo) {
    where.scheduledDate = {
      ...((where.scheduledDate as object) || {}),
      lte: new Date(filters.dateTo),
    };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: true,
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        address: true,
        reviews: { where: { authorId: customerId } },
      },
      orderBy: { scheduledDate: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getProviderBookings(
  userId: string,
  filters: BookingFilterInput,
) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  const where: Prisma.BookingWhereInput = { providerId: provider.id };

  // EMPLOYEEs only see their own assigned bookings
  if (memberRole === "EMPLOYEE" && member) {
    where.assignedMemberId = member.id;
  }

  if (filters.status) {
    const statuses = filters.status.split(",") as BookingStatus[];
    where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
  }
  if (filters.dateFrom) {
    where.scheduledDate = {
      ...((where.scheduledDate as object) || {}),
      gte: new Date(filters.dateFrom),
    };
  }
  if (filters.dateTo) {
    where.scheduledDate = {
      ...((where.scheduledDate as object) || {}),
      lte: new Date(filters.dateTo),
    };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedMember: {
          select: {
            id: true,
            displayName: true,
            role: true,
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        address: true,
        reviews: true,
      },
      orderBy: { scheduledDate: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getBookingById(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      provider: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      address: true,
      reviews: true,
      payment: true,
    },
  });

  if (!booking) throw new NotFoundError("Booking");

  // Verify user is a participant (customer, provider owner, or team member)
  const isParticipant =
    booking.customerId === userId || booking.provider.userId === userId;

  if (!isParticipant) {
    const membership = await prisma.providerMember.findFirst({
      where: {
        userId,
        providerId: booking.providerId,
        status: "ACTIVE",
      },
    });
    if (!membership) {
      throw new ForbiddenError("Not authorized to view this booking");
    }
  }

  return booking;
}
