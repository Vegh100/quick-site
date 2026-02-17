import { MemberRole, MemberStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError, AppError } from "../lib/errors.js";
import {
  InviteMemberInput,
  UpdateMemberInput,
} from "../validators/member.validators.js";

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
    return {
      provider: ownedProvider,
      member: null as any,
      memberRole: "OWNER" as MemberRole,
      isOwner: true,
    };
  }

  // 2. Check if user is a team member
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
// INVITE MEMBER (Owner/Manager only)
// ============================================================================

export async function inviteMember(userId: string, data: InviteMemberInput) {
  const { provider, memberRole } = await getProviderForUser(userId);

  // Only OWNER and MANAGER can invite
  if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
    throw new ForbiddenError("Only owners and managers can invite members");
  }

  // Only OWNER can invite MANAGERs
  if (data.role === "MANAGER" && memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can invite managers");
  }

  // Provider must be COMPANY type
  if (provider.providerType !== "COMPANY") {
    throw new AppError(
      "Only company providers can add team members. Upgrade to company first.",
      400,
    );
  }

  // Check if email is already a member
  const existing = await prisma.providerMember.findFirst({
    where: {
      providerId: provider.id,
      invitedEmail: data.email.toLowerCase(),
      status: { not: "DEACTIVATED" },
    },
  });
  if (existing) {
    throw new AppError(
      "This email is already a member or has a pending invite",
      409,
    );
  }

  // Check if the user with this email already belongs to another provider
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
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
      throw new AppError("This user already belongs to another provider", 409);
    }
  }

  const member = await prisma.providerMember.create({
    data: {
      providerId: provider.id,
      role: data.role as MemberRole,
      invitedEmail: data.email.toLowerCase(),
      displayName: data.displayName,
      status: "INVITED",
      // If user already exists, link them immediately and set ACTIVE
      ...(existingUser
        ? {
            userId: existingUser.id,
            status: "ACTIVE",
            joinedAt: new Date(),
          }
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

  // If user exists and is CUSTOMER, change their role to PROVIDER
  if (existingUser && existingUser.role === "CUSTOMER") {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "PROVIDER" },
    });
  }

  return member;
}

// ============================================================================
// ACCEPT INVITE (for users who registered after being invited)
// ============================================================================

export async function acceptInvite(userId: string, memberId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  const member = await prisma.providerMember.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new NotFoundError("Invite");

  if (member.status !== "INVITED") {
    throw new AppError(
      "This invite has already been used or is no longer valid",
      400,
    );
  }

  if (member.invitedEmail !== user.email.toLowerCase()) {
    throw new ForbiddenError("This invite is for a different email address");
  }

  // Check user doesn't already belong to another provider
  const existingMembership = await prisma.providerMember.findUnique({
    where: { userId },
  });
  if (existingMembership && existingMembership.id !== memberId) {
    throw new AppError("You already belong to another provider", 409);
  }

  const updated = await prisma.providerMember.update({
    where: { id: memberId },
    data: {
      userId,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    include: {
      provider: {
        select: { id: true, businessName: true },
      },
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

  // Update user role to PROVIDER if not already
  if (user.role === "CUSTOMER") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "PROVIDER" },
    });
  }

  return updated;
}

// ============================================================================
// LIST MEMBERS
// ============================================================================

export async function listMembers(userId: string) {
  const { provider, memberRole } = await getProviderForUser(userId);

  // Only OWNER and MANAGER can list all members
  if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
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
    },
    orderBy: [
      { role: "asc" }, // OWNER first
      { joinedAt: "asc" },
    ],
  });

  return members;
}

// ============================================================================
// UPDATE MEMBER (role, displayName)
// ============================================================================

export async function updateMember(
  userId: string,
  memberId: string,
  data: UpdateMemberInput,
) {
  const { provider, memberRole } = await getProviderForUser(userId);

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id },
  });
  if (!target) throw new NotFoundError("Team member");

  // Cannot modify OWNER
  if (target.role === "OWNER") {
    throw new ForbiddenError("Cannot modify the owner");
  }

  // Only OWNER can change roles
  if (data.role && memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can change member roles");
  }

  return prisma.providerMember.update({
    where: { id: memberId },
    data: {
      ...(data.role ? { role: data.role as MemberRole } : {}),
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
// DEACTIVATE MEMBER
// ============================================================================

export async function deactivateMember(userId: string, memberId: string) {
  const { provider, memberRole } = await getProviderForUser(userId);

  // Only OWNER and MANAGER can deactivate
  if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
    throw new ForbiddenError("Not authorized to deactivate members");
  }

  const target = await prisma.providerMember.findFirst({
    where: { id: memberId, providerId: provider.id },
  });
  if (!target) throw new NotFoundError("Team member");

  // Cannot deactivate OWNER
  if (target.role === "OWNER") {
    throw new ForbiddenError("Cannot deactivate the owner");
  }

  // MANAGER cannot deactivate other MANAGERs
  if (target.role === "MANAGER" && memberRole !== "OWNER") {
    throw new ForbiddenError("Only the owner can deactivate managers");
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
// UPGRADE SOLO → COMPANY
// ============================================================================

export async function upgradeToCompany(userId: string) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw new NotFoundError("Provider profile");

  if (provider.providerType === "COMPANY") {
    throw new AppError("Provider is already a company", 400);
  }

  // Get user email for the owner member record
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  // Update type + ensure OWNER member exists
  const [updated] = await prisma.$transaction([
    prisma.provider.update({
      where: { id: provider.id },
      data: { providerType: "COMPANY" },
    }),
    // Ensure owner ProviderMember row exists
    prisma.providerMember.upsert({
      where: { userId },
      create: {
        providerId: provider.id,
        userId,
        role: "OWNER",
        status: "ACTIVE",
        invitedEmail: user.email,
        joinedAt: new Date(),
      },
      update: {},
    }),
  ]);

  return updated;
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
