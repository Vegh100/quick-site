import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import * as messagingService from "../services/messaging.service.js";

/**
 * GET /api/messages/conversations
 */
export async function getConversations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const conversations = await messagingService.getMyConversations(req.user!.userId);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/messages/conversations — start or get conversation with a user
 */
export async function startConversation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId: otherUserId } = req.body;
    if (!otherUserId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const conversation = await messagingService.getOrCreateConversation(
      req.user!.userId,
      otherUserId,
    );
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/messages/conversations/:id/messages
 */
export async function getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await messagingService.getMessages(req.user!.userId, req.params.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/messages/conversations/:id/messages
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ success: false, error: "Message content is required" });
      return;
    }

    const message = await messagingService.sendMessage(req.user!.userId, req.params.id, content);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/messages/unread-count
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const count = await messagingService.getTotalUnreadCount(req.user!.userId);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
}
