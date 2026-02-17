import prisma from "../lib/prisma.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";

export async function addFavorite(userId: string, providerId: string) {
  // Verify provider exists
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  if (!provider) throw new NotFoundError("Provider");

  const existing = await prisma.favorite.findUnique({
    where: { userId_providerId: { userId, providerId } },
  });

  if (existing) {
    throw new ConflictError("Already in favorites");
  }

  return prisma.favorite.create({
    data: { userId, providerId },
    include: {
      provider: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          categories: { include: { category: true } },
        },
      },
    },
  });
}

export async function removeFavorite(userId: string, providerId: string) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_providerId: { userId, providerId } },
  });

  if (!existing) throw new NotFoundError("Favorite");

  await prisma.favorite.delete({
    where: { userId_providerId: { userId, providerId } },
  });
}

export async function getFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    include: {
      provider: {
        include: {
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
          categories: { include: { category: true } },
          services: {
            where: { isActive: true },
            take: 3,
            orderBy: { priceAmount: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isFavorite(userId: string, providerId: string) {
  const fav = await prisma.favorite.findUnique({
    where: { userId_providerId: { userId, providerId } },
  });
  return !!fav;
}
