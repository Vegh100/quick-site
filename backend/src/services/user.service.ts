import prisma from "../lib/prisma.js";
import { NotFoundError } from "../lib/errors.js";
import {
  UpdateProfileInput,
  AddAddressInput,
  UpdateAddressInput,
  UpdateNotificationPrefsInput,
} from "../validators/user.validators.js";

// ============================================================================
// PROFILE
// ============================================================================

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      provider: {
        select: {
          id: true,
          businessName: true,
          onboardingDone: true,
          isVerified: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError("User");
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true },
  });
}

// ============================================================================
// ADDRESSES
// ============================================================================

export async function getAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function addAddress(userId: string, data: AddAddressInput) {
  // If setting as default, unset existing default
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: { ...data, userId },
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw new NotFoundError("Address");

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data,
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw new NotFoundError("Address");

  await prisma.address.delete({ where: { id: addressId } });
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export async function getNotificationPrefs(userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({ data: { userId } });
  }

  return prefs;
}

export async function updateNotificationPrefs(
  userId: string,
  data: UpdateNotificationPrefsInput,
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
