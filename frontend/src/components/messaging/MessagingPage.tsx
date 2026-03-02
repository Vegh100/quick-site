import { useState, useRef, useEffect, useCallback } from "react";
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
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { useIsMobile } from "../ui/use-mobile";
import type { ConversationListItem, MessageItem } from "../../lib/api-services";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

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
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Ma";
  if (d.toDateString() === yesterday.toDateString()) return "Tegnap";
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getUserName(u: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "Felhasználó";
}

function getInitials(u: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    (u.firstName?.[0]?.toUpperCase() ?? "") +
      (u.lastName?.[0]?.toUpperCase() ?? "") || "?"
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVATAR
   ═══════════════════════════════════════════════════════════════════════════ */

const GRADIENTS = [
  "from-orange-400 to-rose-400",
  "from-violet-400 to-indigo-400",
  "from-emerald-400 to-teal-400",
  "from-sky-400 to-blue-400",
  "from-pink-400 to-fuchsia-400",
  "from-amber-400 to-orange-400",
];

function Avatar({
  user,
  size = "md",
}: {
  user: {
    id?: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  size?: "xs" | "sm" | "md";
}) {
  const cls = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
  };
  const gi =
    ((user.id || user.firstName || "")?.charCodeAt(0) || 0) % GRADIENTS.length;

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`${cls[size]} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls[size]} rounded-full bg-gradient-to-br ${GRADIENTS[gi]} flex items-center justify-center text-white font-semibold shrink-0`}
    >
      {getInitials(user)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVERSATION LIST
   ═══════════════════════════════════════════════════════════════════════════ */

function ConversationList({
  onSelect,
  selectedId,
}: {
  onSelect: (c: ConversationListItem) => void;
  selectedId: string | null;
}) {
  const { data: convData, isLoading } = useConversations();
  const conversations = convData?.data ?? [];
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const list = q
    ? conversations.filter((c) =>
        getUserName(c.otherUser).toLowerCase().includes(q.toLowerCase()),
      )
    : conversations;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Empty ── */
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Nincsenek üzenetek
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Küldj üzenetet egy foglalás részletoldaláról!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search bar */}
      {conversations.length > 3 && (
        <div className="p-3 pb-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Keresés…"
              className="h-9 w-full rounded-lg bg-muted/60 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
            />
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 && q ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            Nincs találat: „{q}"
          </p>
        ) : (
          list.map((conv) => {
            const active = selectedId === conv.id;
            const unread = conv.unreadCount > 0;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  active
                    ? "bg-primary/10 dark:bg-primary/20"
                    : "hover:bg-muted/60"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" />
                )}

                {/* avatar */}
                <div className="relative shrink-0">
                  <Avatar user={conv.otherUser} size="md" />
                  {unread && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* text */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-[13px] ${
                        unread ? "font-bold" : "font-medium text-foreground/90"
                      }`}
                    >
                      {getUserName(conv.otherUser)}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] tabular-nums ${
                        unread
                          ? "font-semibold text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  {conv.lastMessage && (
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        unread
                          ? "font-medium text-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAT VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

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
  const sendMsg = useSendMessage();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messages: MessageItem[] = msgData?.data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const t = setTimeout(() => taRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [conversationId]);

  const send = useCallback(() => {
    const content = text.trim();
    if (!content || sendMsg.isPending) return;
    sendMsg.mutate(
      { conversationId, content },
      {
        onSuccess: () => {
          setText("");
          if (taRef.current) taRef.current.style.height = "auto";
          taRef.current?.focus();
        },
      },
    );
  }, [text, conversationId, sendMsg]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
  };

  // Group by date
  const groups: { date: string; msgs: MessageItem[] }[] = [];
  for (const m of messages) {
    const dk = new Date(m.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last?.date === dk) last.msgs.push(m);
    else groups.push({ date: dk, msgs: [m] });
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Avatar user={otherUser} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {getUserName(otherUser)}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Smile className="h-6 w-6 text-primary/40" />
            </div>
            <p className="text-sm font-medium">Beszélgetés indítása</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Írj egy üzenetet {getUserName(otherUser).split(" ")[0]} számára!
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.date}>
              {/* date pill */}
              <div className="my-4 flex items-center justify-center">
                <span className="rounded-full bg-background px-3 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/50">
                  {formatDateSeparator(g.msgs[0].createdAt)}
                </span>
              </div>

              <div className="space-y-0.5">
                {g.msgs.map((msg, i) => {
                  const mine = msg.senderId === user?.id;
                  const prev = g.msgs[i - 1];
                  const next = g.msgs[i + 1];
                  const first = !prev || prev.senderId !== msg.senderId;
                  const last = !next || next.senderId !== msg.senderId;
                  const showAvatar = !mine && last;

                  const radius = (() => {
                    if (first && last) return "rounded-2xl";
                    if (mine) {
                      if (first) return "rounded-2xl rounded-br-md";
                      if (last) return "rounded-2xl rounded-tr-md";
                      return "rounded-2xl rounded-r-md";
                    }
                    if (first) return "rounded-2xl rounded-bl-md";
                    if (last) return "rounded-2xl rounded-tl-md";
                    return "rounded-2xl rounded-l-md";
                  })();

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${
                        mine ? "justify-end" : "justify-start"
                      } ${first ? "mt-3" : ""}`}
                    >
                      {/* avatar slot */}
                      {!mine && (
                        <div className="w-7 shrink-0">
                          {showAvatar ? (
                            <Avatar user={otherUser} size="xs" />
                          ) : null}
                        </div>
                      )}

                      {/* bubble */}
                      <div
                        className={`max-w-[75%] ${radius} px-3 py-2 shadow-sm sm:max-w-[65%] ${
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-background ring-1 ring-border/60"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                          {msg.content}
                        </p>
                        <div
                          className={`mt-0.5 flex items-center gap-1 ${
                            mine ? "justify-end" : ""
                          }`}
                        >
                          <span
                            className={`text-[10px] ${
                              mine
                                ? "text-primary-foreground/50"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </span>
                          {mine &&
                            (msg.isRead ? (
                              <CheckCheck className="h-3 w-3 text-sky-300" />
                            ) : (
                              <Check className="h-3 w-3 text-primary-foreground/40" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 bg-card p-4">
        <div className="flex items-end gap-2.5 rounded-xl border bg-muted/30 p-2 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            ref={taRef}
            value={text}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder="Üzenet írása…"
            maxLength={2000}
            rows={1}
            className="min-h-[36px] max-h-[130px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
          />
          <Button
            onClick={send}
            disabled={!text.trim() || sendMsg.isPending}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            {sendMsg.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40 select-none"></p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

interface MessagingPageProps {
  initialUserId?: string;
}

export function MessagingPage({ initialUserId }: MessagingPageProps = {}) {
  const [selected, setSelected] = useState<ConversationListItem | null>(null);
  const startConv = useStartConversation();
  const [autoStarted, setAutoStarted] = useState(false);
  const { data: convData, isLoading } = useConversations();
  const hasConvs = (convData?.data ?? []).length > 0;
  const isMobile = useIsMobile();

  // auto-open conversation
  useEffect(() => {
    if (!initialUserId || autoStarted) return;
    setAutoStarted(true);
    startConv.mutate(initialUserId, {
      onSuccess: (data) => {
        const c = data.data;
        if (!c) return;
        const other = c.user1?.id === c.user1Id && c.user2 ? c.user2 : c.user1;
        setSelected({
          id: c.id,
          otherUser: other || {
            id: initialUserId,
            firstName: null,
            lastName: null,
            avatarUrl: null,
          },
          lastMessage: c.lastMessage || null,
          lastMessageAt: c.lastMessageAt || null,
          unreadCount: 0,
          createdAt: c.createdAt,
        });
      },
    });
  }, [initialUserId, autoStarted]);

  const containerStyle = {
    height: "calc(100vh - 10rem)",
    minHeight: 500,
    maxHeight: 900,
  } as const;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center rounded-2xl border bg-card"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Üzenetek betöltése…</p>
        </div>
      </div>
    );
  }

  /* ── No conversations ── */
  if (!hasConvs && !selected) {
    return (
      <div
        style={containerStyle}
        className="flex flex-col items-center justify-center rounded-2xl border bg-card px-6 text-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary/40" />
        </div>
        <h2 className="text-lg font-bold">Üzenetek</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
          Itt fognak megjelenni a beszélgetéseid. Küldj üzenetet egy foglalás
          részletoldaláról!
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          Foglalás → Részletek → „Üzenet küldése"
        </div>
      </div>
    );
  }

  /* ── Split Layout ── */
  const showList = isMobile ? !selected : true;
  const showChat = isMobile ? !!selected : true;

  return (
    <div
      style={containerStyle}
      className="flex overflow-hidden rounded-2xl border bg-card"
    >
      {/* LEFT — conversation list */}
      {showList && (
        <aside
          className={`flex flex-col border-r ${
            isMobile ? "w-full" : "w-80 lg:w-[340px] shrink-0"
          }`}
        >
          {/* sidebar header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-bold">Üzenetek</h2>
          </div>
          <ConversationList
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
          />
        </aside>
      )}

      {/* RIGHT — chat or placeholder */}
      {showChat && (
        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <ChatView
              conversationId={selected.id}
              otherUser={selected.otherUser}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm font-medium text-foreground/70">
                Válassz egy beszélgetést
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kattints egy névre a bal oldalon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
