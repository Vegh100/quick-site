import { Response, NextFunction } from "express";
import * as userService from "../services/user.service.js";
import { AuthenticatedRequest } from "../types/index.js";
import { uploadToR2 } from "../lib/upload.js";
import { uploadConfig } from "../config/upload.config.js";

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const avatarUrl = await uploadToR2(req.file, uploadConfig.subdirs.avatars);
    const result = await userService.updateAvatar(req.user!.userId, avatarUrl);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const addresses = await userService.getAddresses(req.user!.userId);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
}

export async function addAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const address = await userService.addAddress(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const address = await userService.updateAddress(
      req.user!.userId,
      req.params.addressId,
      req.body,
    );
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await userService.deleteAddress(req.user!.userId, req.params.addressId);
    res.json({ success: true, message: "Address deleted" });
  } catch (error) {
    next(error);
  }
}

export async function getNotificationPrefs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const prefs = await userService.getNotificationPrefs(req.user!.userId);
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
}

export async function updateNotificationPrefs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const prefs = await userService.updateNotificationPrefs(req.user!.userId, req.body);
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
}
