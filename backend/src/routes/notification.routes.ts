import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.delete("/", notificationController.clearAllNotifications);

export default router;
