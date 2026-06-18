import { useBookingTimeline } from "../../hooks/useApi";
import { Clock, Check, Play, CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import type { BookingActivityItem } from "../../lib/api-services";

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  CREATED: {
    icon: FileText,
    color: "#6366f1",
    bgColor: "#eef2ff",
    label: "Foglalás létrehozva",
  },
  PENDING: {
    icon: Clock,
    color: "#f59e0b",
    bgColor: "#fffbeb",
    label: "Függőben",
  },
  CONFIRMED: {
    icon: Check,
    color: "#3b82f6",
    bgColor: "#eff6ff",
    label: "Megerősítve",
  },
  IN_PROGRESS: {
    icon: Play,
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    label: "Folyamatban",
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: "#10b981",
    bgColor: "#ecfdf5",
    label: "Befejezve",
  },
  CANCELLED: {
    icon: XCircle,
    color: "#ef4444",
    bgColor: "#fef2f2",
    label: "Lemondva",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPerformerName(activity: BookingActivityItem): string {
  if (!activity.performer) return "Rendszer";
  return (
    [activity.performer.firstName, activity.performer.lastName].filter(Boolean).join(" ") ||
    "Felhasználó"
  );
}

export function BookingTimeline({ bookingId }: { bookingId: string }) {
  const { data: timelineData, isLoading } = useBookingTimeline(bookingId);
  const activities = timelineData?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">Nincs tevékenységi napló.</p>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[17px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-border via-border/50 to-transparent" />

      <div className="space-y-0">
        {activities.map((activity, index) => {
          const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.CREATED;
          const Icon = config.icon;
          const isLast = index === activities.length - 1;

          return (
            <div key={activity.id} className="relative flex gap-4 pb-6">
              {/* Icon */}
              <div
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: config.bgColor,
                  borderColor: config.color,
                }}
              >
                <Icon className="h-4 w-4" style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className={`flex-1 pt-1 ${isLast ? "" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{config.label}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{getPerformerName(activity)}</p>
                {activity.note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">„{activity.note}"</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
