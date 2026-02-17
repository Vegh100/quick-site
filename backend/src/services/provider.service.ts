import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import {
  CreateProviderInput,
  UpdateProviderInput,
  AddServiceInput,
  UpdateServiceInput,
  SetAvailabilityInput,
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
      subscription: true,
    },
  });

  return provider;
}

export async function updateProvider(
  userId: string,
  data: UpdateProviderInput,
) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

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
  const provider = await prisma.provider.findUnique({
    where: { userId },
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
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      availability: { orderBy: { dayOfWeek: "asc" } },
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
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      availability: {
        where: { isEnabled: true },
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!provider) throw new NotFoundError("Provider");
  return provider;
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
    where.serviceArea = { contains: filters.city, mode: "insensitive" };
  }

  if (filters.maxPrice) {
    where.services = {
      some: { priceAmount: { lte: filters.maxPrice }, isActive: true },
    };
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
          take: 3,
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
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  return prisma.service.create({
    data: {
      ...data,
      priceAmount: new Prisma.Decimal(data.priceAmount),
      providerId: provider.id,
    },
  });
}

export async function updateService(
  userId: string,
  serviceId: string,
  data: UpdateServiceInput,
) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
  });
  if (!service) throw new NotFoundError("Service");

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
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id },
  });
  if (!service) throw new NotFoundError("Service");

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
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  // Upsert availability for each day
  const results = await Promise.all(
    data.availability.map((slot) =>
      prisma.availability.upsert({
        where: {
          providerId_dayOfWeek: {
            providerId: provider.id,
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
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        },
      }),
    ),
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
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  return prisma.provider.update({
    where: { id: provider.id },
    data,
  });
}

// ============================================================================
// STATS
// ============================================================================

export async function getProviderStats(userId: string) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  const [
    totalBookings,
    completedBookings,
    pendingBookings,
    revenueResult,
    uniqueClients,
  ] = await Promise.all([
    prisma.booking.count({ where: { providerId: provider.id } }),
    prisma.booking.count({
      where: { providerId: provider.id, status: "COMPLETED" },
    }),
    prisma.booking.count({
      where: { providerId: provider.id, status: "PENDING" },
    }),
    prisma.booking.aggregate({
      where: { providerId: provider.id, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: { providerId: provider.id },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
  ]);

  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyBookings = await prisma.booking.findMany({
    where: {
      providerId: provider.id,
      status: "COMPLETED",
      completedAt: { gte: sixMonthsAgo },
    },
    select: { completedAt: true, totalAmount: true },
  });

  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
    const monthRevenue = monthlyBookings
      .filter(
        (b) =>
          b.completedAt && b.completedAt.toISOString().startsWith(monthStr),
      )
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    revenueByMonth.push({ month: monthStr, revenue: monthRevenue });
  }

  return {
    totalBookings,
    completedBookings,
    pendingBookings,
    totalRevenue: Number(revenueResult._sum.totalAmount || 0),
    averageRating: Number(provider.rating),
    totalReviews: provider.reviewCount,
    totalClients: uniqueClients.length,
    revenueByMonth,
  };
}

// ============================================================================
// CLIENTS LIST
// ============================================================================

export async function getProviderClients(userId: string, page = 1, limit = 20) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  const skip = (page - 1) * limit;

  const bookings = await prisma.booking.findMany({
    where: { providerId: provider.id },
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
          where: { providerId: provider.id },
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
