import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as referralController from "../controllers/referral.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", referralController.getMyReferral);
router.post("/redeem", referralController.redeemReferral);

export default router;
