import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { getProviderForUser } from "./member.service.js";
import {
  CreateProviderInput,
  UpdateProviderInput,
  AddServiceInput,
  UpdateServiceInput,
  SetAvailabilityInput,
  SetServiceSlotsInput,
  UpdatePricingSettingsInput,
  ProviderSearchInput,
} from "../validators/provider.validators.js";

// ============================================================================
// CREATE / ONBOARD PROVIDER
// ============================================================================

export async function createProvider(
  userId: string,
  data: CreateProviderInput,
) {
  const { categoryIds, ...providerData } = data;

  // Get user email for the owner member record
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  // Update user role to PROVIDER
  await prisma.user.update({
    where: { id: userId },
    data: { role: "PROVIDER" },
  });

  const provider = await prisma.provider.create({
    data: {
      ...providerData,
      userId,
      onboardingDone: true,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      // Create OWNER member record
      members: {
        create: {
          userId,
          role: "OWNER",
          status: "ACTIVE",
          invitedEmail: user.email,
          displayName:
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
          joinedAt: new Date(),
        },
      },
      // Create default trial subscription
      subscription: {
        create: {
          plan: "STARTER",
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      },
    },
    include: {
      categories: { include: { category: true } },
      members: true,
      subscription: true,
    },
  });

  // Create default availability (Mon-Fri 08:00-17:00) for the OWNER member
  const ownerMember = provider.members[0];
  if (ownerMember) {
    const defaultDays = [1, 2, 3, 4, 5]; // Mon-Fri
    await prisma.availability.createMany({
      data: defaultDays.map((dayOfWeek) => ({
        providerId: provider.id,
        memberId: ownerMember.id,
        dayOfWeek,
        startTime: "08:00",
        endTime: "17:00",
        isEnabled: true,
      })),
    });
  }

  return provider;
}

export async function updateProvider(
  userId: string,
  data: UpdateProviderInput,
) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can update the profile");
  }

  const { categoryIds, ...updateData } = data;

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: updateData,
    include: {
      categories: { include: { category: true } },
    },
  });

  // Update categories if provided
  if (categoryIds && categoryIds.length > 0) {
    await prisma.providerCategory.deleteMany({
      where: { providerId: provider.id },
    });
    await prisma.providerCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        providerId: provider.id,
        categoryId,
      })),
    });
  }

  return updated;
}

// ============================================================================
// GET PROVIDER
// ============================================================================

export async function getProviderByUserId(userId: string) {
  const { provider: resolved } = await getProviderForUser(userId);

  const provider = await prisma.provider.findUnique({
    where: { id: resolved.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      categories: { include: { category: true } },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { serviceType: { include: { category: true } } },
      },
      members: {
        where: { status: { not: "DEACTIVATED" } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          memberServices: {
            include: { service: true },
          },
          availability: {
            orderBy: { dayOfWeek: "asc" },
          },
        },
        orderBy: { role: "asc" },
      },
      subscription: true,
    },
  });

  if (!provider) throw new NotFoundError("Provider profile");
  return provider;
}

export async function getProviderById(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      categories: { include: { category: true } },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          serviceType: { include: { category: true } },
          serviceSlots: {
            select: { dayOfWeek: true, memberId: true },
          },
        },
      },
      members: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          role: true,
          displayName: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          memberServices: {
            include: { service: true },
          },
          availability: {
            where: { isEnabled: true },
            orderBy: { dayOfWeek: "asc" },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  });

  if (!provider) throw new NotFoundError("Provider");
  return provider;
}

// ============================================================================
// BUSINESS HOURS (public)
// ============================================================================

const DAY_NAMES_HU = [
  "Vasárnap",
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
];

export async function getBusinessHours(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!provider) throw new NotFoundError("Provider");

  // Get all availability for active members
  const availability = await prisma.availability.findMany({
    where: {
      providerId,
      isEnabled: true,
      member: { status: "ACTIVE" },
    },
    orderBy: { dayOfWeek: "asc" },
  });

  // Group by day and find earliest start / latest end
  const byDay = new Map<number, { startTime: string; endTime: string }>();

  for (const a of availability) {
    const existing = byDay.get(a.dayOfWeek);
    if (!existing) {
      byDay.set(a.dayOfWeek, { startTime: a.startTime, endTime: a.endTime });
    } else {
      if (a.startTime < existing.startTime) existing.startTime = a.startTime;
      if (a.endTime > existing.endTime) existing.endTime = a.endTime;
    }
  }

  // Build result for all 7 days
  const hours = Array.from({ length: 7 }, (_, i) => {
    const day = byDay.get(i);
    return {
      dayOfWeek: i,
      dayName: DAY_NAMES_HU[i],
      isOpen: !!day,
      startTime: day?.startTime || null,
      endTime: day?.endTime || null,
    };
  });

  return hours;
}

// ============================================================================
// SEARCH / DISCOVERY
// ============================================================================

export async function searchProviders(filters: ProviderSearchInput) {
  const where: Prisma.ProviderWhereInput = {
    onboardingDone: true,
    user: { isActive: true },
  };

  if (filters.categorySlug) {
    where.categories = {
      some: { category: { slug: filters.categorySlug } },
    };
  }

  if (filters.search) {
    where.OR = [
      { businessName: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      {
        services: {
          some: { name: { contains: filters.search, mode: "insensitive" } },
        },
      },
    ];
  }

  if (filters.minRating) {
    where.rating = { gte: filters.minRating };
  }

  if (filters.isVerified !== undefined) {
    where.isVerified = filters.isVerified;
  }

  if (filters.city) {
    // Use AND to ensure city filter doesn't clash with search OR
    where.AND = [
      ...((where.AND as any[]) || []),
      {
        OR: [
          { city: { contains: filters.city, mode: "insensitive" } },
          { serviceArea: { contains: filters.city, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (filters.county) {
    where.county = { contains: filters.county, mode: "insensitive" };
  }

  // Build services filter incrementally
  const serviceFilter: Record<string, any> = { isActive: true };

  if (filters.serviceTypeId) {
    serviceFilter.serviceTypeId = filters.serviceTypeId;
  }

  if (filters.maxPrice) {
    serviceFilter.priceAmount = { lte: filters.maxPrice };
  }

  if (filters.serviceTypeId || filters.maxPrice) {
    where.services = { some: serviceFilter };
  }

  // Build order by
  let orderBy: Prisma.ProviderOrderByWithRelationInput = {};
  switch (filters.sortBy) {
    case "rating":
      orderBy.rating = filters.sortOrder;
      break;
    case "reviewCount":
      orderBy.reviewCount = filters.sortOrder;
      break;
    case "newest":
    case "createdAt":
      orderBy.createdAt = filters.sortOrder;
      break;
    case "price":
      orderBy.rating = filters.sortOrder; // Prisma can't sort by related min; fall back to rating
      break;
    default:
      orderBy.rating = "desc";
  }

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const skip = (page - 1) * limit;

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        categories: { include: { category: true } },
        services: {
          where: { isActive: true },
          orderBy: { priceAmount: "asc" },
          take: 5,
          include: { serviceType: { include: { category: true } } },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.provider.count({ where }),
  ]);

  return {
    providers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// SERVICES (CRUD)
// ============================================================================

export async function addService(userId: string, data: AddServiceInput) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  // Both OWNER and EMPLOYEE can add services
  const service = await prisma.service.create({
    data: {
      ...data,
      priceAmount: new Prisma.Decimal(data.priceAmount),
      providerId: provider.id,
    },
  });

  // Auto-assign the creator (OWNER or EMPLOYEE) to this service
  if (member) {
    await prisma.memberService
      .create({
        data: {
          memberId: member.id,
          serviceId: service.id,
        },
      })
      .catch(() => {
        // Ignore if already exists (unique constraint)
      });
  }

  return service;
}

export async function updateService(
  userId: string,
  serviceId: string,
  data: UpdateServiceInput,
) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
  });
  if (!service) throw new NotFoundError("Service");

  // Employee can only update services assigned to them
  if (memberRole !== "OWNER" && member) {
    const assignment = await prisma.memberService.findFirst({
      where: { memberId: member.id, serviceId },
    });
    if (!assignment) {
      throw new ForbiddenError("You can only update your own services");
    }
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: {
      ...data,
      priceAmount: data.priceAmount
        ? new Prisma.Decimal(data.priceAmount)
        : undefined,
    },
  });
}

export async function deleteService(userId: string, serviceId: string) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
  });
  if (!service) throw new NotFoundError("Service");

  // Employee can only delete services assigned to them
  if (memberRole !== "OWNER" && member) {
    const assignment = await prisma.memberService.findFirst({
      where: { memberId: member.id, serviceId },
    });
    if (!assignment) {
      throw new ForbiddenError("You can only delete your own services");
    }
  }

  // Soft delete by deactivating
  await prisma.service.update({
    where: { id: serviceId },
    data: { isActive: false },
  });
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function setAvailability(
  userId: string,
  data: SetAvailabilityInput,
) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  // Owner can set any member's availability; employee can set own only
  const memberId = data.memberId;

  if (memberRole !== "OWNER") {
    if (!member || member.id !== memberId) {
      throw new ForbiddenError("You can only set your own availability");
    }
  }

  // Verify member belongs to this provider
  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id, status: "ACTIVE" },
  });
  if (!target) throw new NotFoundError("Team member");

  // Upsert availability for each day
  const results = await Promise.all(
    data.availability.map((slot) =>
      prisma.availability.upsert({
        where: {
          memberId_dayOfWeek: {
            memberId,
            dayOfWeek: slot.dayOfWeek,
          },
        },
        update: {
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        },
        create: {
          providerId: provider.id,
          memberId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        },
      }),
    ),
  );

  // Cascade: remove ServiceSlots that fall outside the new availability window
  // If a day is disabled, delete all slots for that day.
  // If a day's time window changed, delete slots that no longer fit.
  await Promise.all(
    data.availability.map((slot) => {
      if (!slot.isEnabled) {
        // Day disabled → delete all service slots for this member on this day
        return prisma.serviceSlot.deleteMany({
          where: { memberId, dayOfWeek: slot.dayOfWeek },
        });
      }
      // Day enabled but time window may have changed → delete slots outside window
      return prisma.serviceSlot.deleteMany({
        where: {
          memberId,
          dayOfWeek: slot.dayOfWeek,
          OR: [
            { startTime: { lt: slot.startTime } },
            { endTime: { gt: slot.endTime } },
          ],
        },
      });
    }),
  );

  return results;
}

// ============================================================================
// PRICING SETTINGS
// ============================================================================

export async function updatePricingSettings(
  userId: string,
  data: UpdatePricingSettingsInput,
) {
  const { provider, memberRole } = await getProviderForUser(userId);
  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can update pricing");
  }

  return prisma.provider.update({
    where: { id: provider.id },
    data,
  });
}

// ============================================================================
// SERVICE SLOTS (per-service, per-member bookable time blocks)
// ============================================================================

export async function setServiceSlots(
  userId: string,
  data: SetServiceSlotsInput,
) {
  const { provider } = await getProviderForUser(userId);

  // Verify service belongs to this provider
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, providerId: provider.id, isActive: true },
  });
  if (!service) throw new NotFoundError("Service");

  // Verify member belongs to this provider
  const member = await prisma.providerMember.findFirst({
    where: { id: data.memberId, providerId: provider.id },
  });
  if (!member) throw new NotFoundError("Member");

  // Delete all existing slots for this service+member, then recreate
  await prisma.serviceSlot.deleteMany({
    where: { serviceId: data.serviceId, memberId: data.memberId },
  });

  if (data.slots.length > 0) {
    await prisma.serviceSlot.createMany({
      data: data.slots.map((slot) => ({
        serviceId: data.serviceId,
        memberId: data.memberId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    });
  }

  return prisma.serviceSlot.findMany({
    where: { serviceId: data.serviceId, memberId: data.memberId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function getServiceSlots(
  userId: string,
  serviceId: string,
  memberId?: string,
) {
  const { provider } = await getProviderForUser(userId);

  // Verify service belongs to this provider
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
  });
  if (!service) throw new NotFoundError("Service");

  return prisma.serviceSlot.findMany({
    where: { serviceId, ...(memberId ? { memberId } : {}) },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// ============================================================================
// STATS
// ============================================================================

export async function getProviderStats(userId: string, memberId?: string) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  // Base filter: all provider bookings, or just a specific member's
  const bookingWhere: any = { providerId: provider.id };

  // EMPLOYEEs always see only their own stats
  if (memberRole === "EMPLOYEE" && member) {
    bookingWhere.assignedMemberId = member.id;
  } else if (memberId) {
    bookingWhere.assignedMemberId = memberId;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );
  const startOfWeek = new Date(now);
  startOfWeek.setDate(
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
  );
  startOfWeek.setHours(0, 0, 0, 0);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalBookings,
    completedBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    inProgressBookings,
    revenueResult,
    uniqueClients,
    thisMonthBookings,
    lastMonthBookings,
    thisMonthRevenue,
    lastMonthRevenue,
    thisWeekBookings,
    recentBookingsRaw,
    bookingsByService,
    memberPerformance,
    dailyBookingsRaw,
  ] = await Promise.all([
    prisma.booking.count({ where: bookingWhere }),
    prisma.booking.count({ where: { ...bookingWhere, status: "COMPLETED" } }),
    prisma.booking.count({ where: { ...bookingWhere, status: "PENDING" } }),
    prisma.booking.count({ where: { ...bookingWhere, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { ...bookingWhere, status: "CANCELLED" } }),
    prisma.booking.count({ where: { ...bookingWhere, status: "IN_PROGRESS" } }),
    prisma.booking.aggregate({
      where: { ...bookingWhere, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    // This month bookings count
    prisma.booking.count({
      where: { ...bookingWhere, createdAt: { gte: startOfMonth } },
    }),
    // Last month bookings count
    prisma.booking.count({
      where: {
        ...bookingWhere,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    // This month revenue
    prisma.booking.aggregate({
      where: {
        ...bookingWhere,
        status: "COMPLETED",
        completedAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    }),
    // Last month revenue
    prisma.booking.aggregate({
      where: {
        ...bookingWhere,
        status: "COMPLETED",
        completedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { totalAmount: true },
    }),
    // This week bookings
    prisma.booking.count({
      where: { ...bookingWhere, createdAt: { gte: startOfWeek } },
    }),
    // Recent 30 days completed bookings for avg value
    prisma.booking.findMany({
      where: {
        ...bookingWhere,
        status: "COMPLETED",
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { totalAmount: true, durationMin: true },
    }),
    // Bookings grouped by service
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: bookingWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Member performance (only when company-wide / no memberId)
    !memberId
      ? prisma.booking.groupBy({
          by: ["assignedMemberId"],
          where: { providerId: provider.id, assignedMemberId: { not: null } },
          _count: { id: true },
          _sum: { totalAmount: true },
        })
      : Promise.resolve([]),
    // Daily bookings for last 30 days
    prisma.booking.findMany({
      where: { ...bookingWhere, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, totalAmount: true, status: true },
    }),
  ]);

  // Revenue by month (last 6 months)
  const monthlyBookings = await prisma.booking.findMany({
    where: {
      ...bookingWhere,
      status: "COMPLETED",
      completedAt: { gte: sixMonthsAgo },
    },
    select: { completedAt: true, totalAmount: true },
  });

  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().substring(0, 7);
    const monthRevenue = monthlyBookings
      .filter(
        (b) =>
          b.completedAt && b.completedAt.toISOString().startsWith(monthStr),
      )
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    revenueByMonth.push({ month: monthStr, revenue: monthRevenue });
  }

  // Daily revenue/bookings for last 30 days
  const dailyData: { date: string; revenue: number; bookings: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const dayBookings = dailyBookingsRaw.filter(
      (b) => b.createdAt.toISOString().substring(0, 10) === dateStr,
    );
    const dayRevenue = dayBookings
      .filter((b) => b.status === "COMPLETED")
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    dailyData.push({
      date: dateStr,
      revenue: dayRevenue,
      bookings: dayBookings.length,
    });
  }

  // Service name resolution for bookingsByService
  const serviceIds = bookingsByService.map((s) => s.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

  const serviceBreakdown = bookingsByService.map((s) => ({
    serviceId: s.serviceId,
    serviceName: serviceMap[s.serviceId] || "Ismeretlen",
    bookingCount: s._count.id,
    revenue: Number(s._sum.totalAmount || 0),
  }));

  // Member performance with names (only for company-wide stats)
  let memberStats: any[] = [];
  if (
    !memberId &&
    Array.isArray(memberPerformance) &&
    memberPerformance.length > 0
  ) {
    const memberIds = memberPerformance
      .map((m: any) => m.assignedMemberId)
      .filter(Boolean);
    const members = await prisma.providerMember.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        displayName: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    const memberMap = Object.fromEntries(
      members.map((m) => [
        m.id,
        m.displayName ||
          `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim(),
      ]),
    );
    memberStats = memberPerformance.map((m: any) => ({
      memberId: m.assignedMemberId,
      memberName: memberMap[m.assignedMemberId] || "Ismeretlen",
      bookingCount: m._count.id,
      revenue: Number(m._sum.totalAmount || 0),
    }));
  }

  // Calculated KPIs
  const totalRevenueNum = Number(revenueResult._sum.totalAmount || 0);
  const thisMonthRevenueNum = Number(thisMonthRevenue._sum.totalAmount || 0);
  const lastMonthRevenueNum = Number(lastMonthRevenue._sum.totalAmount || 0);
  const revenueChange =
    lastMonthRevenueNum > 0
      ? ((thisMonthRevenueNum - lastMonthRevenueNum) / lastMonthRevenueNum) *
        100
      : thisMonthRevenueNum > 0
        ? 100
        : 0;
  const bookingChange =
    lastMonthBookings > 0
      ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100
      : thisMonthBookings > 0
        ? 100
        : 0;
  const completionRate =
    totalBookings > 0
      ? (completedBookings / (completedBookings + cancelledBookings || 1)) * 100
      : 0;
  const avgBookingValue =
    recentBookingsRaw.length > 0
      ? recentBookingsRaw.reduce((sum, b) => sum + Number(b.totalAmount), 0) /
        recentBookingsRaw.length
      : 0;
  const avgDuration =
    recentBookingsRaw.length > 0
      ? recentBookingsRaw.reduce((sum, b) => sum + b.durationMin, 0) /
        recentBookingsRaw.length
      : 0;

  return {
    // Core stats
    totalBookings,
    completedBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    inProgressBookings,
    totalRevenue: totalRevenueNum,
    averageRating: Number(provider.rating),
    totalReviews: provider.reviewCount,
    totalClients: uniqueClients.length,

    // Period comparisons
    thisMonthBookings,
    lastMonthBookings,
    bookingChange: Math.round(bookingChange * 10) / 10,
    thisMonthRevenue: thisMonthRevenueNum,
    lastMonthRevenue: lastMonthRevenueNum,
    revenueChange: Math.round(revenueChange * 10) / 10,
    thisWeekBookings,

    // KPIs
    completionRate: Math.round(completionRate * 10) / 10,
    avgBookingValue: Math.round(avgBookingValue),
    avgDuration: Math.round(avgDuration),

    // Chart data
    revenueByMonth,
    dailyData,
    serviceBreakdown,
    memberStats,

    // Status breakdown for donut chart
    statusBreakdown: [
      { status: "COMPLETED", count: completedBookings, label: "Befejezve" },
      { status: "CONFIRMED", count: confirmedBookings, label: "Megerősítve" },
      { status: "PENDING", count: pendingBookings, label: "Függőben" },
      {
        status: "IN_PROGRESS",
        count: inProgressBookings,
        label: "Folyamatban",
      },
      { status: "CANCELLED", count: cancelledBookings, label: "Lemondva" },
    ].filter((s) => s.count > 0),
  };
}

// ============================================================================
// CLIENTS LIST
// ============================================================================

export async function getProviderClients(
  userId: string,
  page = 1,
  limit = 20,
  memberId?: string,
) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  const skip = (page - 1) * limit;

  const bookingWhere: any = { providerId: provider.id };

  // EMPLOYEEs always see only their own clients
  if (memberRole === "EMPLOYEE" && member) {
    bookingWhere.assignedMemberId = member.id;
  } else if (memberId) {
    bookingWhere.assignedMemberId = memberId;
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: { customerId: true },
    distinct: ["customerId"],
  });

  const customerIds = bookings.map((b) => b.customerId);

  const [clients, total] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bookingsAsCustomer: {
          where: bookingWhere,
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, scheduledDate: true, totalAmount: true },
        },
      },
      skip,
      take: limit,
    }),
    customerIds.length,
  ]);

  return {
    clients,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
