import { Router } from "express";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createReviewSchema,
  reviewFilterSchema,
} from "../validators/review.validators.js";

const router = Router();

// Public: get provider reviews
router.get(
  "/provider/:providerId",
  validate(reviewFilterSchema, "query"),
  reviewController.getProviderReviews,
);

// Authenticated
router.post(
  "/",
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview,
);

router.get(
  "/me",
  authenticate,
  validate(reviewFilterSchema, "query"),
  reviewController.getMyReviews,
);

// Provider responds to a review
router.post(
  "/:id/respond",
  authenticate,
  reviewController.respondToReview,
);

export default router;
