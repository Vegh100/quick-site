import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import * as portfolioService from "../services/portfolio.service.js";
import { uploadToR2 } from "../lib/upload.js";
import { uploadConfig } from "../config/upload.config.js";

export async function getPortfolioImages(req: Request, res: Response, next: NextFunction) {
  try {
    const images = await portfolioService.getPortfolioImages(
      req.params.providerId,
      req.query.serviceId as string | undefined,
    );
    res.json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
}

export async function addPortfolioImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const image = await portfolioService.addPortfolioImage(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}

export async function updatePortfolioImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const image = await portfolioService.updatePortfolioImage(
      req.user!.userId,
      req.params.id,
      req.body,
    );
    res.json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}

export async function deletePortfolioImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await portfolioService.deletePortfolioImage(req.user!.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function uploadPortfolioImageFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }
    const imageUrl = await uploadToR2(req.file, uploadConfig.subdirs.portfolio);
    const caption = typeof req.body.caption === "string" ? req.body.caption : undefined;
    const serviceId = typeof req.body.serviceId === "string" ? req.body.serviceId : undefined;
    const image = await portfolioService.addPortfolioImage(req.user!.userId, {
      imageUrl,
      caption,
      serviceId,
    });
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}
