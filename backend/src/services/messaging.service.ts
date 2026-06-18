import prisma from "../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";

// ============================================================================
// GET OR CREATE CONVERSATION
// ============================================================================

/**
 * Get or create a conversation between two users.
 * Always stores user1Id < user2Id (sorted) to ensure uniqueness.
 */
export async function getOrCreateConversation(currentUserId: string, otherUserId: string) {
  // Sort IDs to ensure consistent ordering
  const [user1Id, user2Id] =
    currentUserId < otherUserId ? [currentUserId, otherUserId] : [otherUserId, currentUserId];

  let conversation = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    include: {
      user1: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      user2: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { user1Id, user2Id },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  return conversation;
}

// ============================================================================
// GET MY CONVERSATIONS
// ============================================================================

export async function getMyConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      user2: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
  });

  // For each conversation, get unread count for current user
  const withUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      // Determine the "other" user
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;

      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt,
      };
    }),
  );

  return withUnread;
}

// ============================================================================
// GET MESSAGES
// ============================================================================

export async function getMessages(userId: string, conversationId: string, page = 1, limit = 50) {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new NotFoundError("Conversation");
  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new ForbiddenError("Not a participant of this conversation");
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  // Mark unread messages from the other user as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return {
    messages: messages.reverse(), // chronological order
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

export async function sendMessage(userId: string, conversationId: string, content: string) {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new NotFoundError("Conversation");
  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new ForbiddenError("Not a participant of this conversation");
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: content.trim(),
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update conversation's last message
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: content.length > 500 ? content.substring(0, 497) + "..." : content,
      lastMessageAt: new Date(),
    },
  });

  return message;
}

// ============================================================================
// GET TOTAL UNREAD COUNT
// ============================================================================

export async function getTotalUnreadCount(userId: string): Promise<number> {
  // Get all conversation IDs for this user
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: { id: true },
  });

  if (conversations.length === 0) return 0;

  return prisma.message.count({
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      isRead: false,
    },
  });
}
