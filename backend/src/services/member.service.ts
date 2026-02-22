import { MemberRole, MemberStatus } from "@prisma/client";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError, AppError } from "../lib/errors.js";
import {
  InviteMemberInput,
  UpdateMemberInput,
} from "../validators/member.validators.js";
import { sendInviteEmail } from "./email.service.js";

// ============================================================================
// HELPER: Resolve which Provider a user belongs to (owner or member)
// Returns { provider, member, memberRole } or throws NotFoundError
// ============================================================================

export async function getProviderForUser(userId: string) {
  // 1. Check if user owns a provider directly
  const ownedProvider = await prisma.provider.findUnique({
    where: { userId },
  });
  if (ownedProvider) {
    // Also fetch the OWNER member record
    const ownerMember = await prisma.providerMember.findFirst({
      where: { providerId: ownedProvider.id, role: "OWNER" },
    });
    return {
      provider: ownedProvider,
      member: ownerMember,
      memberRole: "OWNER" as MemberRole,
      isOwner: true,
    };
  }

  // 2. Check if user is a team member (EMPLOYEE)
  const membership = await prisma.providerMember.findUnique({
    where: { userId },
    include: { provider: true },
  });

  if (membership && membership.status === "ACTIVE") {
    return {
      provider: membership.provider,
      member: membership,
      memberRole: membership.role,
      isOwner: false,
    };
  }

  throw new NotFoundError("Provider profile");
}

// ============================================================================
// INVITE MEMBER (Owner only)
// Creates a ProviderMember with INVITED status and a unique invite token.
// ============================================================================

export async function inviteMember(userId: string, data: InviteMemberInput) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the company owner can invite members");
  }

  const email = data.email.toLowerCase();

  // Check if email is already a member of this company
  const existing = await prisma.providerMember.findFirst({
    where: {
      providerId: provider.id,
      invitedEmail: email,
      status: { not: "DEACTIVATED" },
    },
  });
  if (existing) {
    throw new AppError(
      "This email is already a member or has a pending invite",
      409,
    );
  }

  // Check if the email already belongs to a user in another company
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    const existingMembership = await prisma.providerMember.findUnique({
      where: { userId: existingUser.id },
    });
    if (
      existingMembership &&
      existingMembership.status !== "DEACTIVATED" &&
      existingMembership.providerId !== provider.id
    ) {
      throw new AppError("This user already belongs to another company", 409);
    }
  }

  // Generate unique invite token
  const inviteToken = crypto.randomBytes(32).toString("hex");

  const member = await prisma.providerMember.create({
    data: {
      providerId: provider.id,
      role: "EMPLOYEE",
      invitedEmail: email,
      displayName: data.displayName || null,
      status: "INVITED",
      inviteToken,
    },
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
    },
  });

  // Send invite email (fire-and-forget — don't block the response)
  sendInviteEmail({
    toEmail: email,
    inviteToken,
    businessName: provider.businessName,
    displayName: data.displayName,
  }).catch((err) =>
    console.error("Failed to send invite email:", err.message),
  );

  return { ...member, inviteToken };
}

// ============================================================================
// LIST MEMBERS (Owner only)
// ============================================================================

export async function listMembers(userId: string) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Not authorized to view team members");
  }

  const members = await prisma.providerMember.findMany({
    where: { providerId: provider.id },
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
      memberServices: {
        include: { service: true },
      },
      availability: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
    orderBy: [
      { role: "asc" }, // OWNER first
      { joinedAt: "asc" },
    ],
  });

  return members;
}

// ============================================================================
// UPDATE MEMBER (displayName — Owner only)
// ============================================================================

export async function updateMember(
  userId: string,
  memberId: string,
  data: UpdateMemberInput,
) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can update members");
  }

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id },
  });
  if (!target) throw new NotFoundError("Team member");

  if (target.role === "OWNER") {
    throw new ForbiddenError("Cannot modify the owner through this endpoint");
  }

  return prisma.providerMember.update({
    where: { id: memberId },
    data: {
      ...(data.displayName !== undefined
        ? { displayName: data.displayName }
        : {}),
    },
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
    },
  });
}

// ============================================================================
// DEACTIVATE MEMBER (Owner only)
// ============================================================================

export async function deactivateMember(userId: string, memberId: string) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can deactivate members");
  }

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id },
  });
  if (!target) throw new NotFoundError("Team member");

  if (target.role === "OWNER") {
    throw new ForbiddenError("Cannot deactivate the owner");
  }

  return prisma.providerMember.update({
    where: { id: memberId },
    data: { status: "DEACTIVATED" },
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
    },
  });
}

// ============================================================================
// ASSIGN SERVICE TO MEMBER (Owner only)
// ============================================================================

export async function assignService(
  userId: string,
  memberId: string,
  serviceId: string,
) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can assign services");
  }

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id, status: "ACTIVE" },
  });
  if (!target) throw new NotFoundError("Team member");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id, isActive: true },
  });
  if (!service) throw new NotFoundError("Service");

  return prisma.memberService.create({
    data: { memberId, serviceId },
    include: { service: true },
  });
}

// ============================================================================
// REMOVE SERVICE FROM MEMBER (Owner only)
// ============================================================================

export async function removeService(
  userId: string,
  memberId: string,
  serviceId: string,
) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can remove service assignments");
  }

  const assignment = await prisma.memberService.findFirst({
    where: {
      memberId,
      serviceId,
      member: { providerId: provider.id },
    },
  });
  if (!assignment) throw new NotFoundError("Service assignment");

  await prisma.memberService.delete({ where: { id: assignment.id } });
}

// ============================================================================
// SET MEMBER AVAILABILITY (Owner only, or self for employee)
// ============================================================================

export async function setMemberAvailability(
  userId: string,
  memberId: string,
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isEnabled: boolean;
  }[],
) {
  const { provider, memberRole, member } = await getProviderForUser(userId);

  // Owner can set any member's availability; employee can set own only
  if (memberRole !== "OWNER") {
    if (!member || member.id !== memberId) {
      throw new ForbiddenError("You can only set your own availability");
    }
  }

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id, status: "ACTIVE" },
  });
  if (!target) throw new NotFoundError("Team member");

  const results = await Promise.all(
    availability.map((slot) =>
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

  return results;
}

// ============================================================================
// GET MEMBER DETAIL (Owner only — full profile with booking stats)
// ============================================================================

export async function getMemberDetail(userId: string, memberId: string) {
  const { provider, memberRole } = await getProviderForUser(userId);

  if (memberRole !== "OWNER") {
    throw new ForbiddenError("Not authorized to view member details");
  }

  const member = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id },
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
      memberServices: {
        include: { service: true },
      },
      availability: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });
  if (!member) throw new NotFoundError("Team member");

  // Booking stats for this member
  const [
    totalBookings,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    revenueResult,
    upcomingBookings,
  ] = await Promise.all([
    prisma.booking.count({
      where: { assignedMemberId: memberId },
    }),
    prisma.booking.count({
      where: { assignedMemberId: memberId, status: "COMPLETED" },
    }),
    prisma.booking.count({
      where: { assignedMemberId: memberId, status: "PENDING" },
    }),
    prisma.booking.count({
      where: { assignedMemberId: memberId, status: "CANCELLED" },
    }),
    prisma.booking.aggregate({
      where: { assignedMemberId: memberId, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        assignedMemberId: memberId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        scheduledDate: { gte: new Date() },
      },
      include: {
        service: { select: { name: true } },
        customer: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      take: 10,
    }),
  ]);

  // Recent completed bookings
  const recentBookings = await prisma.booking.findMany({
    where: {
      assignedMemberId: memberId,
      status: "COMPLETED",
    },
    include: {
      service: { select: { name: true } },
      customer: {
        select: { firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  return {
    ...member,
    bookingStats: {
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue: Number(revenueResult._sum.totalAmount || 0),
    },
    upcomingBookings,
    recentBookings,
  };
}

// ============================================================================
// GET INVITE INFO (public — used by the invite registration page)
// ============================================================================

export async function getInviteInfo(token: string) {
  const member = await prisma.providerMember.findUnique({
    where: { inviteToken: token },
    include: {
      provider: {
        select: { id: true, businessName: true, logoUrl: true },
      },
    },
  });

  if (!member || member.status !== "INVITED") {
    throw new NotFoundError("Invite");
  }

  return {
    email: member.invitedEmail,
    displayName: member.displayName,
    provider: member.provider,
  };
}

// ============================================================================
// GET PENDING INVITES for a user (so they can accept after registration)
// ============================================================================

export async function getPendingInvites(email: string) {
  return prisma.providerMember.findMany({
    where: {
      invitedEmail: email.toLowerCase(),
      status: "INVITED",
      userId: null,
    },
    include: {
      provider: {
        select: { id: true, businessName: true, logoUrl: true },
      },
    },
  });
}
