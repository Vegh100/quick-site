import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import * as referralService from "../services/referral.service.js";

/**
 * GET /api/referrals/me — get my referral code + stats
 */
export async function getMyReferral(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await referralService.getMyReferral(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/referrals/redeem — redeem a referral code
 */
export async function redeemReferral(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "Referral code is required" });
      return;
    }

    const result = await referralService.redeemReferral(
      req.user!.userId,
      code.trim().toUpperCase(),
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
