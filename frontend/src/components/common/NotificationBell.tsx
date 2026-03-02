import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "../../hooks/useApi";
import { Bell, Check, CheckCheck, Loader2, Calendar, Star, UserPlus, AlertCircle, X } from "lucide-react";
import { Button } from "../ui/button";

// Map notification types to icons and colors
const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  BOOKING_NEW: {
    icon: <Calendar className="h-4 w-4" />,
    color: "#ff5100",
  },
  BOOKING_CONFIRMED: {
    icon: <Check className="h-4 w-4" />,
    color: "#10b981",
  },
  BOOKING_CANCELLED: {
    icon: <X className="h-4 w-4" />,
    color: "#ef4444",
  },
  BOOKING_COMPLETED: {
    icon: <Star className="h-4 w-4" />,
    color: "#f59e0b",
  },
  REVIEW_RECEIVED: {
    icon: <Star className="h-4 w-4" />,
    color: "#8b5cf6",
  },
  TEAM_INVITE: {
    icon: <UserPlus className="h-4 w-4" />,
    color: "#3b82f6",
  },
  SYSTEM: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "#6b7280",
  },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "most";
  if (diffMin < 60) return `${diffMin} perce`;
  if (diffHours < 24) return `${diffHours} órája`;
  if (diffDays < 7) return `${diffDays} napja`;
  return date.toLocaleDateString("hu-HU");
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const { data: notifData, isLoading } = useNotifications(1, 15);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.data?.unreadCount ?? 0;
  const notifications = notifData?.data?.notifications ?? [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    if (!notif.isRead) {
      markAsRead.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Értesítések"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-in fade-in zoom-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
            <h3 className="font-semibold text-sm">Értesítések</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Összes olvasott
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nincs értesítés</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = typeConfig[notif.type] || typeConfig.SYSTEM;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-none ${
                      !notif.isRead ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}15`, color: config.color }}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm leading-5 ${!notif.isRead ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
