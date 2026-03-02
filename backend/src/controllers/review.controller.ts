import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/review.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export async function createReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const review = await reviewService.createReview(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

export async function getProviderReviews(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await reviewService.getProviderReviews(
      req.params.providerId,
      req.query as any,
    );
    res.json({
      success: true,
      data: { reviews: result.reviews, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyReviews(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const type =
      (req.query.type as string) === "received" ? "received" : "given";
    const result = await reviewService.getUserReviews(
      req.user!.userId,
      type,
      req.query as any,
    );
    res.json({
      success: true,
      data: { reviews: result.reviews, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}

export async function respondToReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { response } = req.body;
    if (!response || typeof response !== "string" || response.trim().length === 0) {
      res
        .status(400)
        .json({ success: false, error: "Response text is required" });
      return;
    }

    const review = await reviewService.respondToReview(
      req.user!.userId,
      req.params.id,
      response.trim(),
    );
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}
