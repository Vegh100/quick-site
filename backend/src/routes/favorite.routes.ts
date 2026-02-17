import { Router } from "express";
import * as favoriteController from "../controllers/favorite.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/", favoriteController.getFavorites);
router.post("/:providerId", favoriteController.addFavorite);
router.delete("/:providerId", favoriteController.removeFavorite);
router.get("/:providerId/check", favoriteController.checkFavorite);

export default router;
