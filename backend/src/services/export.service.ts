import prisma from "../lib/prisma.js";
import { Prisma, BookingStatus } from "@prisma/client";
import { getProviderForUser } from "./member.service.js";

// ============================================================================
// EXPORT BOOKINGS AS CSV
// ============================================================================

export async function exportBookingsCsv(
  userId: string,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    memberId?: string;
  },
): Promise<string> {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  const where: Prisma.BookingWhereInput = { providerId: provider.id };

  if (memberRole === "EMPLOYEE" && member) {
    where.assignedMemberId = member.id;
  }

  if (memberRole === "OWNER" && filters.memberId) {
    where.assignedMemberId = filters.memberId;
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

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { name: true } },
      customer: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      assignedMember: {
        select: {
          displayName: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
    take: 5000, // limit for safety
  });

  // CSV Header
  const headers = [
    "Dátum",
    "Időpont",
    "Szolgáltatás",
    "Ügyfél neve",
    "Ügyfél email",
    "Ügyfél telefon",
    "Munkatárs",
    "Állapot",
    "Összeg",
    "Pénznem",
    "Időtartam (perc)",
    "Megjegyzés",
  ];

  const statusMap: Record<string, string> = {
    PENDING: "Függőben",
    CONFIRMED: "Megerősítve",
    IN_PROGRESS: "Folyamatban",
    COMPLETED: "Befejezve",
    CANCELLED: "Lemondva",
  };

  const rows = bookings.map((b) => {
    const memberName = b.assignedMember
      ? b.assignedMember.displayName ||
        `${b.assignedMember.user?.firstName || ""} ${b.assignedMember.user?.lastName || ""}`.trim()
      : "";

    return [
      new Date(b.scheduledDate).toLocaleDateString("hu-HU"),
      b.scheduledTime,
      b.service.name,
      `${b.customer.firstName || ""} ${b.customer.lastName || ""}`.trim(),
      b.customer.email || "",
      b.customer.phone || "",
      memberName,
      statusMap[b.status] || b.status,
      b.totalAmount.toString(),
      b.currency,
      b.durationMin.toString(),
      b.notes?.replace(/"/g, '""').replace(/[\r\n]+/g, ' ') || "",
    ];
  });

  // Build CSV string with BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csv =
    BOM +
    headers.join(";") +
    "\n" +
    rows.map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\n");

  return csv;
}

// ============================================================================
// REVENUE SUMMARY REPORT
// ============================================================================

export async function getRevenueSummary(
  userId: string,
  dateFrom: string,
  dateTo: string,
) {
  const { provider } = await getProviderForUser(userId);

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // Revenue by service
  const byService = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: {
      providerId: provider.id,
      status: "COMPLETED",
      scheduledDate: { gte: from, lte: to },
    },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });

  // Get service names
  const serviceIds = byService.map((s) => s.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  // Daily revenue
  const dailyBookings = await prisma.booking.findMany({
    where: {
      providerId: provider.id,
      status: "COMPLETED",
      scheduledDate: { gte: from, lte: to },
    },
    select: { scheduledDate: true, totalAmount: true },
    orderBy: { scheduledDate: "asc" },
  });

  const dailyMap = new Map<string, { revenue: number; count: number }>();
  for (const b of dailyBookings) {
    const dateKey = new Date(b.scheduledDate).toISOString().slice(0, 10);
    const existing = dailyMap.get(dateKey) || { revenue: 0, count: 0 };
    existing.revenue += Number(b.totalAmount);
    existing.count += 1;
    dailyMap.set(dateKey, existing);
  }

  // Totals
  const totalRevenue = dailyBookings.reduce(
    (sum, b) => sum + Number(b.totalAmount),
    0,
  );
  const totalCompleted = dailyBookings.length;

  return {
    period: { from: dateFrom, to: dateTo },
    totalRevenue,
    totalCompleted,
    averagePerBooking: totalCompleted > 0 ? totalRevenue / totalCompleted : 0,
    byService: byService.map((s) => ({
      serviceId: s.serviceId,
      serviceName: serviceMap.get(s.serviceId) || "Ismeretlen",
      revenue: Number(s._sum.totalAmount || 0),
      count: s._count._all,
    })),
    daily: Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.count,
    })),
  };
}
