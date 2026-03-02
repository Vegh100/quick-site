import { useState, useRef, useEffect } from "react";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useStartConversation,
} from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  CheckCheck,
  Search,
  Smile,
} from "lucide-react";
import { Button } from "../ui/button";
import type { ConversationListItem, MessageItem } from "../../lib/api-services";

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "most";
  if (diffMin < 60) return `${diffMin} perce`;
  if (diffHours < 24) return `${diffHours} órája`;
  if (diffDays === 1) return "tegnap";
  if (diffDays < 7) return `${diffDays} napja`;
  return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Ma";
  if (date.toDateString() === yesterday.toDateString()) return "Tegnap";
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getUserName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Felhasználó"
  );
}

function getInitials(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const f = user.firstName?.[0]?.toUpperCase() || "";
  const l = user.lastName?.[0]?.toUpperCase() || "";
  return f + l || "?";
}

// ============================================================================
// USER AVATAR
// ============================================================================

const AVATAR_GRADIENTS = [
  "from-orange-400 to-rose-400",
  "from-violet-400 to-indigo-400",
  "from-emerald-400 to-teal-400",
  "from-sky-400 to-blue-400",
  "from-pink-400 to-fuchsia-400",
  "from-amber-400 to-orange-400",
];

function UserAvatar({
  user,
  size = "md",
}: {
  user: {
    id?: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  };

  const gradientIndex =
    ((user.id || user.firstName || "")?.charCodeAt(0) || 0) %
    AVATAR_GRADIENTS.length;

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[gradientIndex]} flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white dark:ring-gray-800`}
    >
      {getInitials(user)}
    </div>
  );
}

// ============================================================================
// CONVERSATION LIST
// ============================================================================

function ConversationList({
  onSelect,
  selectedId,
}: {
  onSelect: (conv: ConversationListItem) => void;
  selectedId: string | null;
}) {
  const { data: convData, isLoading } = useConversations();
  const conversations = convData?.data ?? [];
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? conversations.filter((c) =>
        getUserName(c.otherUser)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : conversations;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
          <p className="text-xs text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
          <MessageSquare className="h-7 w-7 text-primary/40" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Nincsenek üzenetek
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
          Küldj üzenetet egy foglalás részletoldaláról, hogy elindítsd a
          beszélgetést!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search */}
      {conversations.length > 3 && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Keresés..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/50 border-0 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => {
          const isActive = selectedId === conv.id;
          const hasUnread = conv.unreadCount > 0;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-150 relative group
                ${
                  isActive
                    ? "bg-primary/8 border-l-3 border-l-primary"
                    : "hover:bg-muted/40 border-l-3 border-l-transparent"
                }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <UserAvatar user={conv.otherUser} size="md" />
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary rounded-full shadow-sm">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p
                    className={`text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}
                  >
                    {getUserName(conv.otherUser)}
                  </p>
                  <span
                    className={`text-[10px] shrink-0 ml-2 ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}
                  >
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                </div>
                {conv.lastMessage && (
                  <p
                    className={`text-xs truncate leading-relaxed ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}
                  >
                    {conv.lastMessage}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CHAT VIEW
// ============================================================================

function ChatView({
  conversationId,
  otherUser,
  onBack,
}: {
  conversationId: string;
  otherUser: ConversationListItem["otherUser"];
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data: msgData, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: MessageItem[] = msgData?.data?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input when conversation opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [conversationId]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(
      { conversationId, content: newMessage.trim() },
      {
        onSuccess: () => {
          setNewMessage("");
          inputRef.current?.focus();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageItem[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/20 to-transparent">
      {/* ─── Chat Header ─── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 h-8 w-8 rounded-full"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <UserAvatar user={otherUser} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {getUserName(otherUser)}
          </p>
          <p className="text-[11px] text-muted-foreground">Online</p>
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
              <Smile className="h-9 w-9 text-primary/40" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Beszélgetés indítása
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
              Üdvözöld a másik felet! Írj egy üzenetet az alábbi mezőbe.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-muted/70 text-[10px] font-medium text-muted-foreground shadow-sm">
                    {formatDateSeparator(group.messages[0].createdAt)}
                  </span>
                </div>

                {/* Messages in this date group */}
                <div className="space-y-1">
                  {group.messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const nextMsg = group.messages[idx + 1];
                    const prevMsg = group.messages[idx - 1];
                    const isLast =
                      !nextMsg || nextMsg.senderId !== msg.senderId;
                    const isFirst =
                      !prevMsg || prevMsg.senderId !== msg.senderId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"} ${isFirst && !isMine ? "mt-3" : ""}`}
                      >
                        {/* Other user avatar (only on last message in group) */}
                        {!isMine && (
                          <div className="w-7 shrink-0 self-end mr-1.5">
                            {isLast ? (
                              <UserAvatar
                                user={otherUser}
                                size="sm"
                              />
                            ) : null}
                          </div>
                        )}

                        <div
                          className={`max-w-[70%] px-3.5 py-2 ${
                            isMine
                              ? `bg-primary text-primary-foreground ${isLast ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
                              : `bg-card border border-border/50 shadow-sm ${isLast ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
                          }`}
                        >
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}
                          >
                            <span
                              className={`text-[10px] ${
                                isMine
                                  ? "text-primary-foreground/50"
                                  : "text-muted-foreground/70"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <span className="text-primary-foreground/50">
                                {msg.isRead ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Message Input ─── */}
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Üzenet írása..."
              maxLength={2000}
              rows={1}
              className="w-full min-h-[40px] max-h-[120px] px-4 py-2.5 rounded-2xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none leading-relaxed"
            />
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90 shadow-md transition-all duration-200 disabled:opacity-40"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN MESSAGING PAGE
// ============================================================================

interface MessagingPageProps {
  /** If set, auto-start/open a conversation with this user on mount */
  initialUserId?: string;
}

export function MessagingPage({ initialUserId }: MessagingPageProps = {}) {
  const [selectedConv, setSelectedConv] =
    useState<ConversationListItem | null>(null);
  const startConversation = useStartConversation();
  const [autoStarted, setAutoStarted] = useState(false);
  const { data: convData, isLoading: convsLoading } = useConversations();
  const hasConversations = (convData?.data ?? []).length > 0;

  // Auto-start conversation when initialUserId is provided
  useEffect(() => {
    if (initialUserId && !autoStarted) {
      setAutoStarted(true);
      startConversation.mutate(initialUserId, {
        onSuccess: (data) => {
          const conv = data.data;
          if (conv) {
            const otherUser =
              conv.user1?.id === conv.user1Id && conv.user2
                ? conv.user2
                : conv.user1;

            setSelectedConv({
              id: conv.id,
              otherUser: otherUser || {
                id: initialUserId,
                firstName: null,
                lastName: null,
                avatarUrl: null,
              },
              lastMessage: conv.lastMessage || null,
              lastMessageAt: conv.lastMessageAt || null,
              unreadCount: 0,
              createdAt: conv.createdAt,
            });
          }
        },
      });
    }
  }, [initialUserId, autoStarted]);

  // ── Loading state ──
  if (convsLoading) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[400px] flex items-center justify-center rounded-2xl border border-border/60 bg-card shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Üzenetek betöltése...</p>
        </div>
      </div>
    );
  }

  // ── Empty state — no conversations at all ──
  if (!hasConversations && !selectedConv) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[400px] flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card shadow-lg px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-5">
          <MessageSquare className="h-9 w-9 text-primary/30" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Üzenetek</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[360px] leading-relaxed mb-6">
          Itt fognak megjelenni a beszélgetéseid. Küldj üzenetet egy foglalás
          részletoldaláról, hogy elindítsd az első beszélgetést!
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Foglalás → Részletek → „Üzenet küldése"</span>
        </div>
      </div>
    );
  }

  // ── Conversations exist — show split panel ──
  return (
    <div className="h-[calc(100vh-200px)] min-h-[400px] flex rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg">
      {/* ─── Left Panel: Conversations ─── */}
      <div
        className={`w-full md:w-[340px] lg:w-[380px] md:min-w-[280px] md:border-r border-border/60 flex flex-col bg-card ${
          selectedConv ? "hidden md:flex" : ""
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            Üzenetek
          </h2>
        </div>

        {/* Conversation List */}
        <ConversationList
          onSelect={setSelectedConv}
          selectedId={selectedConv?.id ?? null}
        />
      </div>

      {/* ─── Right Panel: Chat ─── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          !selectedConv ? "hidden md:flex" : ""
        }`}
      >
        {selectedConv ? (
          <ChatView
            conversationId={selectedConv.id}
            otherUser={selectedConv.otherUser}
            onBack={() => setSelectedConv(null)}
          />
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 via-transparent to-primary/5 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-5 shadow-inner">
              <MessageSquare className="h-9 w-9 text-primary/30" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Válassz egy beszélgetést
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed">
              Kattints egy beszélgetésre a bal oldalon a folytatáshoz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

