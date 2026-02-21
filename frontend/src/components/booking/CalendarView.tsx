import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Wrench,
  X,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useProviderBookings } from "../../hooks/useApi";
import type { Booking, BookingStatus } from "../../lib/types";

const DAY_NAMES = ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Va"];

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  IN_PROGRESS: "bg-purple-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

const STATUS_HU: Record<BookingStatus, string> = {
  PENDING: "Függőben",
  CONFIRMED: "Megerősítve",
  IN_PROGRESS: "Folyamatban",
  COMPLETED: "Befejezve",
  CANCELLED: "Lemondva",
};

function getMonthName(month: number): string {
  const names = [
    "Január",
    "Február",
    "Március",
    "Április",
    "Május",
    "Június",
    "Július",
    "Augusztus",
    "Szeptember",
    "Október",
    "November",
    "December",
  ];
  return names[month];
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch bookings for the current month range
  const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: bookingsData, isLoading } = useProviderBookings(
    { dateFrom, dateTo, limit: 200 },
    true,
  );
  const bookings = bookingsData?.data?.bookings || [];

  // Group bookings by day-of-month
  const bookingsByDay = useMemo(() => {
    const map = new Map<number, Booking[]>();
    for (const b of bookings) {
      // scheduledDate is "YYYY-MM-DD"
      const day = parseInt(b.scheduledDate.split("-")[2], 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(b);
    }
    // Sort each day's bookings by time
    for (const [, dayBookings] of map) {
      dayBookings.sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime),
      );
    }
    return map;
  }, [bookings]);

  // Stats
  const activeBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "COMPLETED",
  );
  const confirmedCount = bookings.filter(
    (b) => b.status === "CONFIRMED",
  ).length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  // Calendar grid computation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() returns 0=Sun, we want 0=Mon
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const selectedDayBookings = selectedDay
    ? bookingsByDay.get(selectedDay) || []
    : [];

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Havi foglalások</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Megerősített</p>
          <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Függőben</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Aktív</p>
          <p className="text-2xl font-bold text-primary">
            {activeBookings.length}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {getMonthName(month)} {year}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Ma
              </Button>
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells before the first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const dayBookings = bookingsByDay.get(day) || [];
                  const isToday = day === todayDay;
                  const isSelected = day === selectedDay;
                  const hasBookings = dayBookings.length > 0;

                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSelectedDay(day === selectedDay ? null : day)
                      }
                      className={`
                        aspect-square border rounded-lg p-1.5 hover:bg-muted/50 transition-all text-left flex flex-col
                        ${isToday ? "border-primary bg-primary/5" : ""}
                        ${isSelected ? "ring-2 ring-primary border-primary" : ""}
                        ${!hasBookings ? "opacity-70" : ""}
                      `}
                    >
                      <span
                        className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}
                      >
                        {day}
                      </span>
                      {/* Booking dots */}
                      {dayBookings.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {dayBookings.slice(0, 4).map((b) => (
                            <div
                              key={b.id}
                              className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status]}`}
                              title={`${b.scheduledTime} - ${b.service?.name || "Foglalás"}`}
                            />
                          ))}
                          {dayBookings.length > 4 && (
                            <span className="text-[10px] text-muted-foreground leading-none">
                              +{dayBookings.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            {(
              [
                "PENDING",
                "CONFIRMED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
              ] as BookingStatus[]
            ).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`}
                />
                <span className="text-xs text-muted-foreground">
                  {STATUS_HU[status]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Day Details Panel */}
        <Card className="p-6">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {getMonthName(month)} {selectedDay}.
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDay(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedDayBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nincs foglalás erre a napra
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`p-3 rounded-lg border ${STATUS_COLORS[booking.status]}`}
                    >
                      {/* Time */}
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">
                          {booking.scheduledTime}
                          {booking.scheduledEndTime
                            ? ` – ${booking.scheduledEndTime}`
                            : ""}
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {STATUS_HU[booking.status]}
                        </Badge>
                      </div>

                      {/* Service */}
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-3.5 w-3.5 opacity-60" />
                        <span className="text-sm">
                          {booking.service?.name || "Szolgáltatás"}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 opacity-60" />
                        <span className="text-sm">
                          {booking.customer?.firstName || ""}{" "}
                          {booking.customer?.lastName || ""}
                          {booking.customer?.email
                            ? ` (${booking.customer.email})`
                            : ""}
                        </span>
                      </div>

                      {/* Assigned member */}
                      {booking.assignedMember && (
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 opacity-60" />
                          <span className="text-sm italic">
                            Munkatárs:{" "}
                            {booking.assignedMember.displayName ||
                              `${booking.assignedMember.user?.firstName || ""} ${booking.assignedMember.user?.lastName || ""}`.trim() ||
                              "—"}
                          </span>
                        </div>
                      )}

                      {/* Address */}
                      {booking.address && (
                        <div className="flex items-start gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 opacity-60 mt-0.5" />
                          <span className="text-sm">
                            {[booking.address.city, booking.address.street]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {booking.notes && (
                        <p className="text-xs mt-2 opacity-75 italic">
                          „{booking.notes}"
                        </p>
                      )}

                      {/* Price */}
                      <div className="mt-2 text-sm font-semibold">
                        {Number(booking.totalAmount)} {booking.currency}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Kattints egy napra a részletek megtekintéséhez
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Re-export Calendar icon for the empty state above
function Calendar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
