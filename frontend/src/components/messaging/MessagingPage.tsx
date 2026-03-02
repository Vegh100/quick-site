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
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { ConversationListItem, MessageItem } from "../../lib/api-services";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "most";
  if (diffMin < 60) return `${diffMin} p`;
  if (diffHours < 24) return `${diffHours} ó`;
  if (diffDays < 7) return `${diffDays} n`;
  return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
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

function UserAvatar({
  user,
  size = "md",
}: {
  user: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold`}
    >
      {user.firstName?.[0]?.toUpperCase() || "?"}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4 text-center">
        <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-medium mb-1">Nincsenek üzenetek</p>
        <p className="text-xs">
          Üzenetet egy foglalás részletoldaláról tudsz küldeni.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/30 ${
            selectedId === conv.id ? "bg-primary/5" : ""
          }`}
        >
          <div className="relative">
            <UserAvatar user={conv.otherUser} />
            {conv.unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-primary rounded-full">
                {conv.unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                {getUserName(conv.otherUser)}
              </p>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                {timeAgo(conv.lastMessageAt)}
              </span>
            </div>
            {conv.lastMessage && (
              <p className={`text-xs mt-0.5 truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {conv.lastMessage}
              </p>
            )}
          </div>
        </button>
      ))}
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

  const messages: MessageItem[] = msgData?.data?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(
      { conversationId, content: newMessage.trim() },
      {
        onSuccess: () => setNewMessage(""),
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <UserAvatar user={otherUser} size="sm" />
        <div>
          <p className="text-sm font-semibold">{getUserName(otherUser)}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Üdv! Kezd el a beszélgetést.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : ""
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? "text-white/60" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMine && (
                        <span className="text-white/60">
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
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Üzenet írása..."
            className="flex-1 rounded-xl"
            maxLength={2000}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="shrink-0 rounded-xl h-10 w-10"
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

  // Auto-start conversation when initialUserId is provided
  useEffect(() => {
    if (initialUserId && !autoStarted) {
      setAutoStarted(true);
      startConversation.mutate(initialUserId, {
        onSuccess: (data) => {
          const conv = data.data;
          if (conv) {
            // Build a ConversationListItem from the response
            // The backend returns the full conversation with user1 and user2
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

  return (
    <div className="h-[calc(100vh-200px)] min-h-[400px] flex rounded-2xl border bg-card overflow-hidden">
      {/* Left: Conversation list */}
      <div
        className={`w-full md:w-[340px] md:border-r flex flex-col ${
          selectedConv ? "hidden md:flex" : ""
        }`}
      >
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Üzenetek
          </h2>
        </div>
        <ConversationList
          onSelect={setSelectedConv}
          selectedId={selectedConv?.id ?? null}
        />
      </div>

      {/* Right: Chat view */}
      <div
        className={`flex-1 flex flex-col ${
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
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Válassz egy beszélgetést</p>
            <p className="text-xs mt-1">
              vagy küldj üzenetet egy foglalás részletoldaláról
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
