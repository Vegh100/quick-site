import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../lib/errors.js";
import { getProviderForUser } from "./member.service.js";
import { cacheable, invalidateCache } from "../lib/cache.js";
import { audit } from "../lib/audit.js";
import { DAY_NAMES } from "../lib/locale.js";
import {
  SERVICE_MATRIX_CATEGORIES,
  SERVICE_MATRIX_DEFINITIONS,
  findServiceMatrixDefinition,
} from "../lib/service-matrix.js";
import {
  CreateProviderInput,
  UpdateProviderInput,
  AddServiceInput,
  UpdateServiceInput,
  SetAvailabilityInput,
  SetServiceSlotsInput,
  UpdatePricingSettingsInput,
  ProviderSearchInput,
  ServiceMatrixInput,
} from "../validators/provider.validators.js";

const providerOnboardingInclude = {
  categories: { include: { category: true } },
  members: true,
  subscription: true,
} satisfies Prisma.ProviderInclude;

// ============================================================================
// CREATE / ONBOARD PROVIDER
// ============================================================================

export async function createProvider(userId: string, data: CreateProviderInput) {
  const { categoryIds = [], ...providerData } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      provider: {
        include: providerOnboardingInclude,
      },
    },
  });
  if (!user) throw new NotFoundError("User");

  if (user.provider) {
    if (user.role !== "PROVIDER") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "PROVIDER" },
      });
    }

    return user.provider;
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: "PROVIDER" },
    });

    return tx.provider.create({
      data: {
        ...providerData,
        userId,
        onboardingDone: true,
        categories: categoryIds.length
          ? {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        members: {
          create: {
            userId,
            role: "OWNER",
            status: "ACTIVE",
            invitedEmail: user.email,
            displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
            joinedAt: new Date(),
          },
        },
        subscription: {
          create: {
            plan: "STARTER",
            status: "TRIAL",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          },
        },
      },
      include: providerOnboardingInclude,
    });
  });
}

export async function updateProvider(userId: string, data: UpdateProviderInput) {
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

  await invalidateCache(`provider:${provider.id}`);

  audit({
    userId,
    action: "UPDATE",
    entity: "Provider",
    entityId: provider.id,
    changes: updateData,
  });

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
            select: {
              serviceId: true,
              service: { select: { id: true, name: true } },
            },
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
  return cacheable(`provider:${providerId}`, 120, async () => {
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
              select: {
                serviceId: true,
                service: { select: { id: true, name: true } },
              },
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
  });
}

// ============================================================================
// BUSINESS HOURS (public)
// ============================================================================

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
      dayName: DAY_NAMES[i],
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

export async function updateService(userId: string, serviceId: string, data: UpdateServiceInput) {
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
      priceAmount: data.priceAmount ? new Prisma.Decimal(data.priceAmount) : undefined,
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
// SERVICE MATRIX (domain-specific pricing grid)
// ============================================================================

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

const SERVICE_TYPE_META: Record<
  string,
  { description: string; defaultDurationMin: number; sortOrder: number }
> = {
  "house-cleaning:House Cleaning": {
    description: "Home cleaning packages for apartments and houses",
    defaultDurationMin: 180,
    sortOrder: 1,
  },
  "car-detailing:Car Detailing": {
    description: "Interior and exterior vehicle detailing packages",
    defaultDurationMin: 90,
    sortOrder: 1,
  },
};

async function ensureServiceMatrixTaxonomy(db: PrismaExecutor) {
  const categories = new Map<string, { id: string }>();
  const serviceTypes = new Map<string, { id: string }>();

  for (const category of SERVICE_MATRIX_CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      select: { id: true },
    });
    categories.set(category.slug, row);
  }

  const serviceTypeDefinitions = Array.from(
    new Map(
      SERVICE_MATRIX_DEFINITIONS.map((definition) => [
        `${definition.categorySlug}:${definition.serviceTypeName}`,
        definition,
      ]),
    ).values(),
  );

  for (const definition of serviceTypeDefinitions) {
    const category = categories.get(definition.categorySlug);
    if (!category) continue;
    const meta = SERVICE_TYPE_META[`${definition.categorySlug}:${definition.serviceTypeName}`] || {
      description: definition.description,
      defaultDurationMin: definition.defaultDurationMin,
      sortOrder: definition.sortOrder,
    };

    const row = await db.serviceType.upsert({
      where: {
        categoryId_name: {
          categoryId: category.id,
          name: definition.serviceTypeName,
        },
      },
      update: {
        description: meta.description,
        defaultDurationMin: meta.defaultDurationMin,
        sortOrder: meta.sortOrder,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        name: definition.serviceTypeName,
        description: meta.description,
        defaultDurationMin: meta.defaultDurationMin,
        sortOrder: meta.sortOrder,
        isActive: true,
      },
      select: { id: true },
    });
    serviceTypes.set(`${definition.categorySlug}:${definition.serviceTypeName}`, row);
  }

  return { categories, serviceTypes };
}

function toMatrixEntry(service: {
  id: string;
  templateKey: string | null;
  priceAmount: Prisma.Decimal;
  durationMin: number;
  isActive: boolean;
  pricingUnit: string;
}) {
  return {
    serviceId: service.id,
    templateKey: service.templateKey,
    priceAmount: service.priceAmount.toString(),
    durationMin: service.durationMin,
    isActive: service.isActive,
    pricingUnit: service.pricingUnit,
  };
}

export async function getServiceMatrix(userId: string) {
  const { provider } = await getProviderForUser(userId);

  const services = await prisma.service.findMany({
    where: {
      providerId: provider.id,
      isMatrixManaged: true,
      templateKey: { not: null },
    },
    orderBy: { sortOrder: "asc" },
  });

  return {
    definitions: SERVICE_MATRIX_DEFINITIONS,
    entries: services.map(toMatrixEntry),
  };
}

export async function upsertServiceMatrix(userId: string, data: ServiceMatrixInput) {
  const { provider, member } = await getProviderForUser(userId);

  const seen = new Set<string>();
  const entries = data.entries.map((entry) => {
    if (seen.has(entry.templateKey)) {
      throw new ValidationError(`Duplicate matrix entry: ${entry.templateKey}`);
    }
    seen.add(entry.templateKey);

    const definition = findServiceMatrixDefinition(entry.templateKey);
    if (!definition) {
      throw new ValidationError(`Unknown matrix entry: ${entry.templateKey}`);
    }

    return { entry, definition };
  });

  const services = await prisma.$transaction(async (tx) => {
    const { categories, serviceTypes } = await ensureServiceMatrixTaxonomy(tx);
    const saved = [];

    for (const { entry, definition } of entries) {
      const category = categories.get(definition.categorySlug);
      const serviceType = serviceTypes.get(
        `${definition.categorySlug}:${definition.serviceTypeName}`,
      );

      if (!category || !serviceType) {
        throw new ValidationError(`Missing taxonomy for matrix entry: ${definition.templateKey}`);
      }

      await tx.providerCategory.upsert({
        where: {
          providerId_categoryId: {
            providerId: provider.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          providerId: provider.id,
          categoryId: category.id,
        },
      });

      const existing = await tx.service.findFirst({
        where: {
          providerId: provider.id,
          templateKey: definition.templateKey,
        },
        select: { id: true },
      });

      const serviceData = {
        serviceTypeId: serviceType.id,
        name: definition.name,
        description: definition.description,
        priceAmount: new Prisma.Decimal(entry.priceAmount),
        priceType: definition.pricingUnit === "PER_SQM" ? "PER_SERVICE" : "FIXED",
        durationMin: entry.durationMin,
        slotIntervalMin: Math.min(Math.max(entry.durationMin, 15), 480),
        templateKey: definition.templateKey,
        serviceKey: definition.serviceKey,
        variantKey: definition.variantKey,
        pricingUnit: definition.pricingUnit,
        isMatrixManaged: true,
        isActive: entry.isActive ?? true,
        sortOrder: definition.sortOrder,
      } satisfies Prisma.ServiceUncheckedUpdateInput;

      const service = existing
        ? await tx.service.update({
            where: { id: existing.id },
            data: serviceData,
            include: { serviceType: { include: { category: true } } },
          })
        : await tx.service.create({
            data: {
              ...serviceData,
              providerId: provider.id,
            } as Prisma.ServiceUncheckedCreateInput,
            include: { serviceType: { include: { category: true } } },
          });

      if (member) {
        await tx.memberService
          .create({
            data: {
              memberId: member.id,
              serviceId: service.id,
            },
          })
          .catch(() => undefined);
      }

      saved.push(service);
    }

    return saved;
  });

  await invalidateCache(`provider:${provider.id}`, "categories:all");

  audit({
    userId,
    action: "UPSERT",
    entity: "ServiceMatrix",
    entityId: provider.id,
    changes: { entries: entries.map(({ definition }) => definition.templateKey) },
  });

  return {
    definitions: SERVICE_MATRIX_DEFINITIONS,
    entries: services.map(toMatrixEntry),
    services,
  };
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function setAvailability(userId: string, data: SetAvailabilityInput) {
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
          OR: [{ startTime: { lt: slot.startTime } }, { endTime: { gt: slot.endTime } }],
        },
      });
    }),
  );

  return results;
}

// ============================================================================
// PRICING SETTINGS
// ============================================================================

export async function updatePricingSettings(userId: string, data: UpdatePricingSettingsInput) {
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

export async function setServiceSlots(userId: string, data: SetServiceSlotsInput) {
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

export async function getServiceSlots(userId: string, serviceId: string, memberId?: string) {
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
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
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
      .filter((b) => b.completedAt && b.completedAt.toISOString().startsWith(monthStr))
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
  if (!memberId && Array.isArray(memberPerformance) && memberPerformance.length > 0) {
    const memberIds = memberPerformance.map((m: any) => m.assignedMemberId).filter(Boolean);
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
        m.displayName || `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim(),
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
      ? ((thisMonthRevenueNum - lastMonthRevenueNum) / lastMonthRevenueNum) * 100
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
      ? recentBookingsRaw.reduce((sum, b) => sum + b.durationMin, 0) / recentBookingsRaw.length
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

export async function getProviderClients(userId: string, page = 1, limit = 20, memberId?: string) {
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
