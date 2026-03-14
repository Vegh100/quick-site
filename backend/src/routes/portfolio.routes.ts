import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadPortfolioImage } from "../lib/upload.js";
import * as portfolioController from "../controllers/portfolio.controller.js";

const router = Router();

// Public: get portfolio for any provider
router.get("/provider/:providerId", portfolioController.getPortfolioImages);

// Authenticated: manage own portfolio
router.post(
  "/upload",
  authenticate,
  uploadPortfolioImage,
  portfolioController.uploadPortfolioImageFile,
);
router.post("/", authenticate, portfolioController.addPortfolioImage);
router.patch("/:id", authenticate, portfolioController.updatePortfolioImage);
router.delete("/:id", authenticate, portfolioController.deletePortfolioImage);

export default router;
