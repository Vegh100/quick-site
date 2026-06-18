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
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProviderBookings } from "../../hooks/useApi";
import type { Booking, BookingStatus } from "../../lib/types";

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES_SHORT = ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Va"];
const DAY_NAMES_FULL = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const MONTH_NAMES = [
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

const HOUR_START = 6;
const HOUR_END = 21;
const HOUR_HEIGHT = 64;
const VISIBLE_DAYS = 3;

const STATUS_STYLE: Record<BookingStatus, React.CSSProperties> = {
  PENDING: {
    backgroundColor: "rgba(251, 191, 36, 0.9)",
    borderColor: "#f59e0b",
    color: "#451a03",
  },
  CONFIRMED: {
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    borderColor: "#2563eb",
    color: "#fff",
  },
  IN_PROGRESS: {
    backgroundColor: "rgba(168, 85, 247, 0.9)",
    borderColor: "#9333ea",
    color: "#fff",
  },
  COMPLETED: {
    backgroundColor: "rgba(16, 185, 129, 0.8)",
    borderColor: "#059669",
    color: "#fff",
  },
  CANCELLED: {
    backgroundColor: "rgba(248, 113, 113, 0.6)",
    borderColor: "#ef4444",
    color: "#450a0a",
  },
};

const STATUS_DOT_COLOR: Record<BookingStatus, string> = {
  PENDING: "#eab308",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#a855f7",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
};

const STATUS_HU: Record<BookingStatus, string> = {
  PENDING: "Függőben",
  CONFIRMED: "Megerősítve",
  IN_PROGRESS: "Folyamatban",
  COMPLETED: "Befejezve",
  CANCELLED: "Lemondva",
};

// ============================================================================
// HELPERS
// ============================================================================

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getDayOfWeekHu(d: Date): string {
  return DAY_NAMES_FULL[(d.getDay() + 6) % 7];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ViewMode = "month" | "day";

interface CalendarViewProps {
  memberId?: string;
}

export function CalendarView({ memberId }: CalendarViewProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // ------- DATA FETCHING -------
  const fetchRange = useMemo(() => {
    if (viewMode === "month") {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return { dateFrom: toDateKey(first), dateTo: toDateKey(last) };
    }
    const from = addDays(focusDate, -7);
    const to = addDays(focusDate, 7);
    return { dateFrom: toDateKey(from), dateTo: toDateKey(to) };
  }, [viewMode, year, month, focusDate]);

  const { data: bookingsData, isLoading } = useProviderBookings(
    { ...fetchRange, limit: 500, ...(memberId ? { memberId } : {}) },
    true,
  );
  const bookings: Booking[] = bookingsData?.data?.bookings || [];

  // Group bookings by date key
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = b.scheduledDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }
    return map;
  }, [bookings]);

  // ------- MONTH VIEW HELPERS -------
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setFocusDate(new Date());
  };

  const openDay = useCallback((date: Date) => {
    setFocusDate(date);
    setViewMode("day");
    setSelectedBooking(null);
  }, []);

  // ------- DAY VIEW HELPERS -------
  const visibleDays = useMemo(() => {
    return Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(focusDate, i));
  }, [focusDate]);

  const prevDays = () => setFocusDate(addDays(focusDate, -VISIBLE_DAYS));
  const nextDays = () => setFocusDate(addDays(focusDate, VISIBLE_DAYS));

  useEffect(() => {
    if (viewMode === "day" && timelineRef.current) {
      const scrollTo = (7 - HOUR_START) * HOUR_HEIGHT;
      timelineRef.current.scrollTop = Math.max(scrollTo, 0);
    }
  }, [viewMode]);

  const hours = useMemo(() => {
    return Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  }, []);

  // Stats
  const activeCount = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "COMPLETED",
  ).length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  // ======================================================================
  // RENDER: MONTH VIEW
  // ======================================================================
  if (viewMode === "month") {
    return (
      <div className="space-y-6">
        {/* Stats */}
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
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {MONTH_NAMES[month]} {year}
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
              {DAY_NAMES_SHORT.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = new Date(year, month, day);
                const key = toDateKey(date);
                const dayBookings = bookingsByDate.get(key) || [];
                const isToday = isSameDay(date, today);
                const hasBookings = dayBookings.length > 0;
                const pendingCount2 = dayBookings.filter((b) => b.status === "PENDING").length;
                const confirmedCount2 = dayBookings.filter(
                  (b) => b.status === "CONFIRMED" || b.status === "IN_PROGRESS",
                ).length;
                const hasPending = pendingCount2 > 0;

                return (
                  <button
                    key={day}
                    onClick={() => openDay(date)}
                    className={[
                      "aspect-square border rounded-lg p-1 hover:bg-muted/50 transition-all text-left flex flex-col cursor-pointer relative overflow-hidden",
                      isToday
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : hasBookings
                          ? "border-border"
                          : "border-border opacity-50",
                    ].join(" ")}
                    style={
                      hasPending
                        ? { borderLeftWidth: 3, borderLeftColor: "#eab308" }
                        : hasBookings && !hasPending
                          ? {
                              borderLeftWidth: 3,
                              borderLeftColor: "#3b82f6",
                            }
                          : undefined
                    }
                  >
                    {/* Day number + booking count badge */}
                    <div className="flex items-start justify-between w-full">
                      <span
                        className={[
                          "text-sm font-medium leading-none",
                          isToday ? "text-primary font-bold" : "",
                        ].join(" ")}
                      >
                        {day}
                      </span>
                      {hasBookings && (
                        <span
                          className="text-[10px] font-bold leading-none rounded-full min-w-[16px] h-[16px] flex items-center justify-center"
                          style={{
                            backgroundColor: hasPending ? "#fef3c7" : "#dbeafe",
                            color: hasPending ? "#92400e" : "#1e40af",
                          }}
                        >
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Mini booking info */}
                    {hasBookings && (
                      <div className="flex flex-col gap-0.5 mt-auto w-full min-w-0 overflow-hidden">
                        {/* Status summary dots + text */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {dayBookings.slice(0, 3).map((b) => (
                            <div
                              key={b.id}
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: STATUS_DOT_COLOR[b.status],
                              }}
                              title={`${b.scheduledTime} - ${b.service?.name || "Foglalás"} (${STATUS_HU[b.status]})`}
                            />
                          ))}
                          {dayBookings.length > 3 && (
                            <span className="text-[9px] text-muted-foreground leading-none flex-shrink-0">
                              +{dayBookings.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Pending label if any */}
                        {hasPending && (
                          <span
                            className="text-[9px] font-medium leading-tight truncate hidden md:block"
                            style={{ color: "#b45309" }}
                          >
                            {pendingCount2} függőben
                          </span>
                        )}
                        {!hasPending && confirmedCount2 > 0 && (
                          <span
                            className="text-[9px] font-medium leading-tight truncate hidden md:block"
                            style={{ color: "#2563eb" }}
                          >
                            {confirmedCount2} megerősítve
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            {(
              ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as BookingStatus[]
            ).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_DOT_COLOR[status] }}
                />
                <span className="text-xs text-muted-foreground">{STATUS_HU[status]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ======================================================================
  // RENDER: DAY / TIMELINE VIEW (Teams-style)
  // ======================================================================
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const colTemplate = `56px repeat(${VISIBLE_DAYS}, 1fr)`;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setViewMode("month")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Havi nézet
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={prevDays}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFocusDate(new Date())}>
            Ma
          </Button>
          <Button variant="outline" size="icon" onClick={nextDays}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day view grid */}
      <Card className="overflow-hidden">
        {/* Day column headers */}
        <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: colTemplate }}>
          {/* Time gutter spacer */}
          <div className="border-r p-2" />

          {visibleDays.map((date) => {
            const isToday = isSameDay(date, today);
            const dateKey = toDateKey(date);
            const count = (bookingsByDate.get(dateKey) || []).filter(
              (b) => b.status !== "CANCELLED",
            ).length;

            return (
              <div
                key={dateKey}
                className={[
                  "p-3 text-center border-r last:border-r-0",
                  isToday ? "bg-primary/5" : "",
                ].join(" ")}
              >
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {getDayOfWeekHu(date)}
                </div>
                <div
                  className={["text-2xl font-bold mt-0.5", isToday ? "text-primary" : ""].join(" ")}
                >
                  {date.getDate()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {MONTH_NAMES[date.getMonth()].slice(0, 3)}.
                </div>
                {count > 0 && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {count} foglalás
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div
          ref={timelineRef}
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div
              className="grid relative"
              style={{ gridTemplateColumns: colTemplate, height: totalHeight }}
            >
              {/* Time gutter */}
              <div className="border-r relative">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex items-start justify-end pr-2"
                    style={{
                      top: (hour - HOUR_START) * HOUR_HEIGHT,
                      height: HOUR_HEIGHT,
                    }}
                  >
                    <span className="text-[11px] text-muted-foreground -translate-y-1.5 tabular-nums">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {visibleDays.map((date) => {
                const dateKey = toDateKey(date);
                const dayBookings = (bookingsByDate.get(dateKey) || []).filter(
                  (b) => b.status !== "CANCELLED",
                );
                const isToday = isSameDay(date, today);

                return (
                  <DayColumn
                    key={dateKey}
                    isToday={isToday}
                    hours={hours}
                    dayBookings={dayBookings}
                    selectedBookingId={selectedBooking?.id || null}
                    onSelectBooking={(b) =>
                      setSelectedBooking(selectedBooking?.id === b.id ? null : b)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Selected booking detail */}
      {selectedBooking && (
        <BookingDetailPanel booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as BookingStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_DOT_COLOR[status] }}
            />
            <span className="text-xs text-muted-foreground">{STATUS_HU[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DAY COLUMN (extracted for clarity)
// ============================================================================

function DayColumn({
  isToday,
  hours,
  dayBookings,
  selectedBookingId,
  onSelectBooking,
}: {
  isToday: boolean;
  hours: number[];
  dayBookings: Booking[];
  selectedBookingId: string | null;
  onSelectBooking: (b: Booking) => void;
}) {
  return (
    <div
      className={["relative border-r last:border-r-0", isToday ? "bg-primary/[0.02]" : ""].join(
        " ",
      )}
    >
      {/* Hour lines */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
        />
      ))}

      {/* Half-hour dashed lines */}
      {hours.map((hour) => (
        <div
          key={`half-${hour}`}
          className="absolute left-0 right-0 border-t border-border/20 border-dashed"
          style={{
            top: (hour - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
          }}
        />
      ))}

      {/* Current time indicator (red line) */}
      {isToday && <CurrentTimeIndicator />}

      {/* Booking blocks */}
      {dayBookings.map((booking) => (
        <BookingBlock
          key={booking.id}
          booking={booking}
          isSelected={selectedBookingId === booking.id}
          onSelect={() => onSelectBooking(booking)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// CURRENT TIME INDICATOR
// ============================================================================

function CurrentTimeIndicator() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = HOUR_START * 60;
  const endMins = HOUR_END * 60;
  if (nowMins < startMins || nowMins > endMins) return null;

  const top = ((nowMins - startMins) / 60) * HOUR_HEIGHT;

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="relative">
        <div className="absolute left-0 w-2.5 h-2.5 -translate-y-1/2 rounded-full bg-red-500" />
        <div className="h-[2px] bg-red-500 ml-2" />
      </div>
    </div>
  );
}

// ============================================================================
// BOOKING BLOCK
// ============================================================================

function BookingBlock({
  booking,
  isSelected,
  onSelect,
}: {
  booking: Booking;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const startMins = timeToMinutes(booking.scheduledTime);
  const endMins = booking.scheduledEndTime
    ? timeToMinutes(booking.scheduledEndTime)
    : startMins + booking.durationMin;
  const top = ((startMins - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = ((endMins - startMins) / 60) * HOUR_HEIGHT;

  const memberName = booking.assignedMember
    ? booking.assignedMember.displayName ||
      [booking.assignedMember.user?.firstName || "", booking.assignedMember.user?.lastName || ""]
        .join(" ")
        .trim()
    : null;

  const statusStyle = STATUS_STYLE[booking.status];
  const isCancelled = booking.status === "CANCELLED";

  return (
    <button
      onClick={onSelect}
      className={[
        "absolute left-1 right-1 rounded-md border px-2 py-1 text-left overflow-hidden transition-all z-10 cursor-pointer",
        isCancelled ? "line-through" : "",
        isSelected ? "ring-2 ring-primary shadow-lg z-30" : "hover:shadow-md hover:z-20",
      ].join(" ")}
      style={{
        top: Math.max(top, 0),
        height: Math.max(height, 22),
        ...statusStyle,
      }}
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight truncate">
        {booking.scheduledTime}
        {booking.scheduledEndTime ? `\u2013${booking.scheduledEndTime}` : ""}
      </div>
      {height > 30 && (
        <div className="text-[11px] leading-tight truncate mt-0.5 opacity-90">
          {booking.service?.name || "Szolgáltatás"}
        </div>
      )}
      {height > 48 && (
        <div className="text-[10px] leading-tight truncate opacity-75">
          {booking.customer?.firstName || ""} {booking.customer?.lastName || ""}
        </div>
      )}
      {height > 64 && memberName && (
        <div className="text-[10px] leading-tight truncate opacity-75 mt-0.5">
          {"\u{1F464}"} {memberName}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// BOOKING DETAIL PANEL
// ============================================================================

function BookingDetailPanel({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const memberName = booking.assignedMember
    ? booking.assignedMember.displayName ||
      [booking.assignedMember.user?.firstName || "", booking.assignedMember.user?.lastName || ""]
        .join(" ")
        .trim() ||
      "\u2014"
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Foglalás részletei</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {/* Time */}
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {booking.scheduledDate} &middot; {booking.scheduledTime}
              {booking.scheduledEndTime ? ` \u2013 ${booking.scheduledEndTime}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{booking.durationMin} perc</p>
          </div>
        </div>

        {/* Service */}
        <div className="flex items-start gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{booking.service?.name || "Szolgáltatás"}</p>
            <p className="text-xs text-muted-foreground">
              {Number(booking.totalAmount)} {booking.currency}
            </p>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {booking.customer?.firstName || ""} {booking.customer?.lastName || ""}
            </p>
            {booking.customer?.email && (
              <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
            )}
          </div>
        </div>

        {/* Status + member */}
        <div className="flex items-start gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: STATUS_DOT_COLOR[booking.status] }}
          />
          <div>
            <Badge variant="outline" className="text-xs">
              {STATUS_HU[booking.status]}
            </Badge>
            {memberName && (
              <p className="text-xs text-muted-foreground mt-1">Munkatárs: {memberName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      {booking.address && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <span>{[booking.address.city, booking.address.street].filter(Boolean).join(", ")}</span>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground italic">&bdquo;{booking.notes}&rdquo;</p>
        </div>
      )}

      {/* Navigate to booking */}
      <div className="mt-4 pt-4 border-t flex justify-end">
        <BookingDetailButton bookingId={booking.id} />
      </div>
    </Card>
  );
}

// ============================================================================
// BOOKING DETAIL BUTTON (needs useNavigate inside router context)
// ============================================================================

function BookingDetailButton({ bookingId }: { bookingId: string }) {
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      onClick={() => navigate(`/szolgaltato/foglalas/${bookingId}`)}
      className="gap-1.5"
    >
      <ArrowLeft className="h-4 w-4 rotate-180" />
      Részletek megtekintése
    </Button>
  );
}
