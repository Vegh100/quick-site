import { useBusinessHours } from "../../hooks/useApi";
import { Clock, Loader2 } from "lucide-react";

export function BusinessHoursCard({ providerId }: { providerId: string }) {
  const { data: hoursData, isLoading } = useBusinessHours(providerId);
  const hours = hoursData?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hours.length === 0) return null;

  // Reorder: Mon-Sun (1,2,3,4,5,6,0) instead of Sun-Sat
  const ordered = [...hours.slice(1), hours[0]];

  const today = new Date().getDay();

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Nyitvatartás
      </h3>
      <div className="space-y-1.5">
        {ordered.map((day) => {
          const isToday = day.dayOfWeek === today;
          return (
            <div
              key={day.dayOfWeek}
              className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-sm ${
                isToday ? "bg-primary/5 font-medium" : ""
              }`}
            >
              <span className={`${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {day.dayName}
                {isToday && (
                  <span className="ml-1.5 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">
                    ma
                  </span>
                )}
              </span>
              {day.isOpen ? (
                <span className={isToday ? "text-primary" : ""}>
                  {day.startTime} – {day.endTime}
                </span>
              ) : (
                <span className="text-muted-foreground/50 text-xs">Zárva</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
