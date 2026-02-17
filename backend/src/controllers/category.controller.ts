import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { providers: true },
        },
      },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
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
