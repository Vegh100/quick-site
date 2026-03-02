import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as messagingController from "../controllers/messaging.controller.js";

const router = Router();

router.use(authenticate);

router.get("/conversations", messagingController.getConversations);
router.post("/conversations", messagingController.startConversation);
router.get("/conversations/:id/messages", messagingController.getMessages);
router.post("/conversations/:id/messages", messagingController.sendMessage);
router.get("/unread-count", messagingController.getUnreadCount);

export default router;
