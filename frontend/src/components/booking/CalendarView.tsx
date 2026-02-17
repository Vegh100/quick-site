import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  time: string;
  customer: string;
  service: string;
  status: "confirmed" | "pending";
}

const events: Record<string, CalendarEvent[]> = {
  "24": [
    { id: "1", time: "10:00", customer: "Emma J.", service: "Deep Cleaning", status: "confirmed" },
    { id: "2", time: "14:00", customer: "John D.", service: "Basic Cleaning", status: "pending" },
  ],
  "25": [
    { id: "3", time: "09:00", customer: "Sarah W.", service: "Garden", status: "confirmed" },
  ],
  "26": [
    { id: "4", time: "11:00", customer: "Mike C.", service: "Car Wash", status: "confirmed" },
    { id: "5", time: "15:00", customer: "Lisa M.", service: "Deep Cleaning", status: "pending" },
  ],
};

export function CalendarView() {
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const startDay = 2; // October 2025 starts on Wednesday

  return (
    <div className="space-y-6">
      {/* Bookings Summary */}
      <Card className="p-6">
        <h3 className="mb-4">Upcoming Bookings</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="default">Confirmed</Badge>
            <span className="text-sm text-muted-foreground">12 bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Pending</Badge>
            <span className="text-sm text-muted-foreground">5 bookings</span>
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3>October 2025</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}

          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map((day) => {
            const dayEvents = events[day.toString()] || [];
            const isToday = day === 23;

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 hover:bg-muted/50 transition-colors ${
                  isToday ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="text-sm mb-1">
                  <span className={isToday ? "text-primary" : ""}>{day}</span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                      title={`${event.time} - ${event.customer}: ${event.service}`}
                    >
                      {event.time} {event.customer}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}