import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authConfig } from "../config/auth.config.js";
import { AppError, ConflictError, UnauthorizedError } from "../lib/errors.js";
import { AuthPayload, GoogleUserInfo } from "../types/index.js";
import {
  RegisterInput,
  LoginInput,
  RegisterFromInviteInput,
} from "../validators/auth.validators.js";

const googleClient = new OAuth2Client(authConfig.google.clientId);

// ============================================================================
// REGISTER
// ============================================================================

export async function register(
  input: RegisterInput,
  userAgent?: string,
  ipAddress?: string,
) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    authConfig.password.saltRounds,
  );

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role as UserRole,
    },
  });

  // Create notification preferences
  await prisma.notificationPreference.create({
    data: { userId: user.id },
  });

  const { token, session } = await createSession(
    user.id,
    user.email,
    user.role,
    userAgent,
    ipAddress,
  );

  return {
    user: sanitizeUser(user),
    token,
    sessionId: session.id,
  };
}

// ============================================================================
// REGISTER FROM INVITE (EMPLOYEE only — via invite token)
// ============================================================================

export async function registerFromInvite(
  inviteToken: string,
  input: RegisterFromInviteInput,
  userAgent?: string,
  ipAddress?: string,
) {
  // Find the invite
  const member = await prisma.providerMember.findUnique({
    where: { inviteToken },
    include: { provider: true },
  });

  if (!member) {
    throw new AppError("Invalid or expired invite link", 400);
  }
  if (member.status !== "INVITED") {
    throw new AppError("This invite has already been used", 400);
  }

  // Check if email is already registered
  const existing = await prisma.user.findUnique({
    where: { email: member.invitedEmail },
  });
  if (existing) {
    throw new ConflictError(
      "Email already registered. Please log in and accept the invite from your dashboard.",
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    authConfig.password.saltRounds,
  );

  // Create user + link member in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: member.invitedEmail,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: "EMPLOYEE",
      },
    });

    // Link member to the new user + activate
    await tx.providerMember.update({
      where: { id: member.id },
      data: {
        userId: newUser.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        inviteToken: null, // Consume the token
        displayName:
          member.displayName ||
          `${input.firstName} ${input.lastName}`.trim() ||
          null,
      },
    });

    // Create notification preferences
    await tx.notificationPreference.create({
      data: { userId: newUser.id },
    });

    return newUser;
  });

  const { token, session } = await createSession(
    user.id,
    user.email,
    user.role,
    userAgent,
    ipAddress,
  );

  return {
    user: sanitizeUser(user),
    token,
    sessionId: session.id,
    provider: {
      id: member.provider.id,
      businessName: member.provider.businessName,
    },
  };
}

// ============================================================================
// LOGIN
// ============================================================================

export async function login(
  input: LoginInput,
  userAgent?: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.isActive) {
    throw new UnauthorizedError("Account is deactivated");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { token, session } = await createSession(
    user.id,
    user.email,
    user.role,
    userAgent,
    ipAddress,
  );

  return {
    user: sanitizeUser(user),
    token,
    sessionId: session.id,
  };
}

// ============================================================================
// GOOGLE AUTH
// ============================================================================

export async function googleAuth(
  credential: string,
  preferredRole?: string,
  userAgent?: string,
  ipAddress?: string,
) {
  // Verify Google token
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: authConfig.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError("Invalid Google credential");
  }

  const googleUser: GoogleUserInfo = {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified ?? false,
    name: payload.name ?? "",
    given_name: payload.given_name ?? "",
    family_name: payload.family_name ?? "",
    picture: payload.picture ?? "",
  };

  // Check if OAuth account exists
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccId: {
        provider: "google",
        providerAccId: googleUser.sub,
      },
    },
    include: { user: true },
  });

  let user;
  let isNewUser = false;

  if (existingOAuth) {
    // Existing user - login
    user = existingOAuth.user;
    if (!user.isActive) {
      throw new UnauthorizedError("Account is deactivated");
    }
  } else {
    // Check if email already exists (link accounts)
    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (existingUser) {
      // Link Google to existing account
      await prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: "google",
          providerAccId: googleUser.sub,
        },
      });
      user = existingUser;
    } else {
      // Create new user
      const role = (
        preferredRole === "PROVIDER" ? "PROVIDER" : "CUSTOMER"
      ) as UserRole;
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.given_name,
          lastName: googleUser.family_name,
          avatarUrl: googleUser.picture,
          role,
          emailVerified: googleUser.email_verified,
          oauthAccounts: {
            create: {
              provider: "google",
              providerAccId: googleUser.sub,
            },
          },
        },
      });
      isNewUser = true;

      // Create notification preferences
      await prisma.notificationPreference.create({
        data: { userId: user.id },
      });
    }
  }

  const { token, session } = await createSession(
    user.id,
    user.email,
    user.role,
    userAgent,
    ipAddress,
  );

  return {
    user: sanitizeUser(user),
    token,
    sessionId: session.id,
    isNewUser,
  };
}

// ============================================================================
// LOGOUT
// ============================================================================

export async function logout(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function logoutAll(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (!user.passwordHash) {
    throw new AppError(
      "Account uses Google sign-in. Set a password first.",
      400,
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const newHash = await bcrypt.hash(
    newPassword,
    authConfig.password.saltRounds,
  );
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

async function createSession(
  userId: string,
  email: string,
  role: UserRole,
  userAgent?: string,
  ipAddress?: string,
) {
  // Enforce max sessions
  const activeSessions = await prisma.session.count({ where: { userId } });
  if (activeSessions >= authConfig.session.maxActive) {
    // Delete oldest session
    const oldest = await prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) {
      await prisma.session.delete({ where: { id: oldest.id } });
    }
  }

  const expiresAt = new Date(Date.now() + authConfig.cookie.options.maxAge);

  const session = await prisma.session.create({
    data: {
      userId,
      token: "", // Will be updated with JWT
      userAgent: userAgent?.substring(0, 500),
      ipAddress: ipAddress?.substring(0, 45),
      expiresAt,
    },
  });

  const payload: AuthPayload = {
    userId,
    email,
    role,
    sessionId: session.id,
  };

  const token = jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn as string,
  } as jwt.SignOptions);

  // Update session with token
  await prisma.session.update({
    where: { id: session.id },
    data: { token },
  });

  return { token, session };
}

function sanitizeUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
