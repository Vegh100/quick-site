import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { cacheable } from "../lib/cache.js";

const SERVICE_DOMAIN_SLUGS = ["house-cleaning", "car-detailing"];

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await cacheable("categories:all", 300, () =>
      prisma.category.findMany({
        where: { isActive: true, slug: { in: SERVICE_DOMAIN_SLUGS } },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { providers: true },
          },
        },
      }),
    );

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    if (!SERVICE_DOMAIN_SLUGS.includes(req.params.slug)) {
      res.status(404).json({ success: false, error: "Category not found" });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: {
          select: { providers: true },
        },
      },
    });

    if (!category) {
      res.status(404).json({ success: false, error: "Category not found" });
      return;
    }

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function getServiceTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId } = req.query as { categoryId?: string };

    const where: any = {
      isActive: true,
      category: { slug: { in: SERVICE_DOMAIN_SLUGS } },
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    res.json({ success: true, data: serviceTypes });
  } catch (error) {
    next(error);
  }
}
