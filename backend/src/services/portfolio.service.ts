import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { getProviderForUser } from "./member.service.js";

// ============================================================================
// GET PORTFOLIO IMAGES
// ============================================================================

export async function getPortfolioImages(providerId: string, serviceId?: string) {
  const where: { providerId: string; serviceId?: string } = { providerId };
  if (serviceId) where.serviceId = serviceId;

  return prisma.portfolioImage.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      service: { select: { id: true, name: true } },
    },
  });
}

// ============================================================================
// ADD PORTFOLIO IMAGE
// ============================================================================

export async function addPortfolioImage(
  userId: string,
  data: { imageUrl: string; caption?: string; serviceId?: string },
) {
  const { provider } = await getProviderForUser(userId);

  // Get current max sort order
  const maxSort = await prisma.portfolioImage.findFirst({
    where: { providerId: provider.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return prisma.portfolioImage.create({
    data: {
      providerId: provider.id,
      serviceId: data.serviceId || null,
      imageUrl: data.imageUrl,
      caption: data.caption || null,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
    include: {
      service: { select: { id: true, name: true } },
    },
  });
}

// ============================================================================
// DELETE PORTFOLIO IMAGE
// ============================================================================

export async function deletePortfolioImage(userId: string, imageId: string) {
  const { provider } = await getProviderForUser(userId);

  const image = await prisma.portfolioImage.findUnique({
    where: { id: imageId },
  });

  if (!image) throw new NotFoundError("Portfolio image");
  if (image.providerId !== provider.id) {
    throw new ForbiddenError("Not your portfolio image");
  }

  await prisma.portfolioImage.delete({ where: { id: imageId } });
}

// ============================================================================
// UPDATE CAPTION
// ============================================================================

export async function updatePortfolioImage(
  userId: string,
  imageId: string,
  data: { caption?: string; sortOrder?: number },
) {
  const { provider } = await getProviderForUser(userId);

  const image = await prisma.portfolioImage.findUnique({
    where: { id: imageId },
  });

  if (!image) throw new NotFoundError("Portfolio image");
  if (image.providerId !== provider.id) {
    throw new ForbiddenError("Not your portfolio image");
  }

  return prisma.portfolioImage.update({
    where: { id: imageId },
    data: {
      ...(data.caption !== undefined && { caption: data.caption }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
    include: {
      service: { select: { id: true, name: true } },
    },
  });
}
