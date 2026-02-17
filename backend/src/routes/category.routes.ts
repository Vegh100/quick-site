import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";

const router = Router();

router.get("/", categoryController.getCategories);
router.get("/:slug", categoryController.getCategoryBySlug);

export default router;
