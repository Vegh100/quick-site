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
// HELPER: compute end time from start time + duration
// ============================================================================

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// ============================================================================
// GET AVAILABLE SLOTS for a given service + date + optional member
// ============================================================================

export async function getAvailableSlots(
  providerId: string,
  serviceId: string,
  date: string,
  memberId?: string,
) {
  // Verify service
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId, isActive: true },
  });
  if (!service) throw new NotFoundError("Service");

  const scheduledDate = new Date(date);
  const dayOfWeek = scheduledDate.getDay();

  // Get relevant availability
  let availabilities;
  if (memberId) {
    const avail = await prisma.availability.findUnique({
      where: { memberId_dayOfWeek: { memberId, dayOfWeek } },
    });
    availabilities = avail ? [avail] : [];
  } else {
    availabilities = await prisma.availability.findMany({
      where: { providerId, dayOfWeek, isEnabled: true },
      include: { member: { select: { id: true, status: true } } },
    });
    // Only keep active members' availability
    availabilities = availabilities.filter(
      (a) => (a as any).member?.status === "ACTIVE",
    );
  }

  if (availabilities.length === 0 || !availabilities.some((a) => a.isEnabled)) {
    return { slots: [], date, serviceId };
  }

  // Merge availability windows to find the widest window
  let earliestStart = "23:59";
  let latestEnd = "00:00";
  const memberIds: string[] = [];
  for (const a of availabilities) {
    if (!a.isEnabled) continue;
    if (a.startTime < earliestStart) earliestStart = a.startTime;
    if (a.endTime > latestEnd) latestEnd = a.endTime;
    memberIds.push(a.memberId);
  }

  const interval = service.slotIntervalMin;
  const serviceDuration = service.durationMin;

  // Generate all possible start times at interval steps
  const allSlots: string[] = [];
  const startMinutes =
    parseInt(earliestStart.split(":")[0]) * 60 +
    parseInt(earliestStart.split(":")[1]);
  const endMinutes =
    parseInt(latestEnd.split(":")[0]) * 60 + parseInt(latestEnd.split(":")[1]);

  for (let m = startMinutes; m + serviceDuration <= endMinutes; m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    allSlots.push(
      `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
    );
  }

  // Fetch existing bookings for this provider on this date that overlap
  const existingBookings = await prisma.booking.findMany({
    where: {
      providerId,
      scheduledDate: scheduledDate,
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      ...(memberId ? { assignedMemberId: memberId } : {}),
    },
    select: {
      scheduledTime: true,
      scheduledEndTime: true,
      durationMin: true,
      assignedMemberId: true,
    },
  });

  // For each slot, check if at least one member is free
  const slots = allSlots.map((startTime) => {
    const endTime = addMinutesToTime(startTime, serviceDuration);

    // Check if any available member is free at this slot
    let isAvailable = false;

    if (memberId) {
      // Specific member requested — check only them
      const conflict = existingBookings.some((b) => {
        const bEnd =
          b.scheduledEndTime ||
          addMinutesToTime(b.scheduledTime, b.durationMin);
        return b.scheduledTime < endTime && bEnd > startTime;
      });
      isAvailable = !conflict;
    } else {
      // Any member — check if at least one is free
      for (const mId of memberIds) {
        // Check this member's availability window
        const memberAvail = availabilities.find((a) => a.memberId === mId);
        if (!memberAvail || !memberAvail.isEnabled) continue;
        if (startTime < memberAvail.startTime || endTime > memberAvail.endTime)
          continue;

        // Check conflicts for this specific member
        const conflict = existingBookings.some((b) => {
          if (b.assignedMemberId !== mId) return false;
          const bEnd =
            b.scheduledEndTime ||
            addMinutesToTime(b.scheduledTime, b.durationMin);
          return b.scheduledTime < endTime && bEnd > startTime;
        });
        if (!conflict) {
          isAvailable = true;
          break;
        }
      }
    }

    return { startTime, endTime, isAvailable };
  });

  return { slots, date, serviceId };
}

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

  // If assigned to a specific member, check their availability
  // Otherwise check any member of the provider has availability
  let availability;
  if (data.assignedMemberId) {
    availability = await prisma.availability.findUnique({
      where: {
        memberId_dayOfWeek: { memberId: data.assignedMemberId, dayOfWeek },
      },
    });
  } else {
    // Check if any active member is available on this day
    availability = await prisma.availability.findFirst({
      where: {
        providerId: data.providerId,
        dayOfWeek,
        isEnabled: true,
      },
    });
  }

  if (!availability || !availability.isEnabled) {
    throw new AppError("No one is available on this day", 400);
  }

  if (
    data.scheduledTime < availability.startTime ||
    data.scheduledTime >= availability.endTime
  ) {
    throw new AppError("Selected time is outside availability", 400);
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

  // Check for slot conflicts
  const bookingEndTime = addMinutesToTime(
    data.scheduledTime,
    service.durationMin,
  );

  const conflictWhere: Prisma.BookingWhereInput = {
    providerId: data.providerId,
    scheduledDate: new Date(data.scheduledDate),
    status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
  };

  if (data.assignedMemberId) {
    conflictWhere.assignedMemberId = data.assignedMemberId;
  }

  const overlapping = await prisma.booking.findMany({
    where: conflictWhere,
    select: {
      scheduledTime: true,
      scheduledEndTime: true,
      durationMin: true,
      assignedMemberId: true,
    },
  });

  // If no specific member, find an available member to auto-assign
  let autoAssignMemberId: string | null = null;
  if (!data.assignedMemberId) {
    // Find members with the service assigned AND available on this day
    const availableMembers = await prisma.providerMember.findMany({
      where: {
        providerId: data.providerId,
        status: "ACTIVE",
        memberServices: { some: { serviceId: data.serviceId } },
        availability: {
          some: { dayOfWeek, isEnabled: true },
        },
      },
      include: {
        availability: { where: { dayOfWeek } },
      },
    });

    for (const am of availableMembers) {
      const avail = am.availability[0];
      if (
        !avail ||
        data.scheduledTime < avail.startTime ||
        bookingEndTime > avail.endTime
      )
        continue;

      const memberConflict = overlapping.some((b) => {
        if (b.assignedMemberId !== am.id) return false;
        const bEnd =
          b.scheduledEndTime ||
          addMinutesToTime(b.scheduledTime, b.durationMin);
        return b.scheduledTime < bookingEndTime && bEnd > data.scheduledTime;
      });

      if (!memberConflict) {
        autoAssignMemberId = am.id;
        break;
      }
    }

    if (!autoAssignMemberId) {
      throw new AppError("No available team member for this time slot", 400);
    }
  } else {
    // Check the specific member doesn't have a conflict
    const hasConflict = overlapping.some((b) => {
      const bEnd =
        b.scheduledEndTime || addMinutesToTime(b.scheduledTime, b.durationMin);
      return b.scheduledTime < bookingEndTime && bEnd > data.scheduledTime;
    });
    if (hasConflict) {
      throw new AppError("This time slot is already booked", 400);
    }
  }

  const assignedMemberId = data.assignedMemberId || autoAssignMemberId;

  const status = provider.autoAccept ? "CONFIRMED" : "PENDING";

  const booking = await prisma.booking.create({
    data: {
      customerId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      assignedMemberId,
      scheduledDate: new Date(data.scheduledDate),
      scheduledTime: data.scheduledTime,
      scheduledEndTime: bookingEndTime,
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
