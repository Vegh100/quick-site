import { Request, Response, NextFunction } from "express";
import * as favoriteService from "../services/favorite.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export async function addFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const favorite = await favoriteService.addFavorite(req.user!.userId, req.params.providerId);
    res.status(201).json({ success: true, data: favorite });
  } catch (error) {
    next(error);
  }
}

export async function removeFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await favoriteService.removeFavorite(req.user!.userId, req.params.providerId);
    res.json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    next(error);
  }
}

export async function getFavorites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const favorites = await favoriteService.getFavorites(req.user!.userId);
    res.json({ success: true, data: favorites });
  } catch (error) {
    next(error);
  }
}

export async function checkFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const isFavorite = await favoriteService.isFavorite(req.user!.userId, req.params.providerId);
    res.json({ success: true, data: { isFavorite } });
  } catch (error) {
    next(error);
  }
}
