import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Loader2, Save, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServiceSlots, useSetServiceSlots } from "../../hooks/useApi";
import type { Service } from "../../lib/types";

interface ServiceSlotPickerProps {
  service: Service;
  memberId: string;
}

const DAYS_HU = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];

// Map display index (0=Mon) → dayOfWeek (1=Mon..6=Sat, 0=Sun)
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0];

interface SlotEntry {
  startTime: string;
  endTime: string;
}

interface DayConfig {
  isEnabled: boolean;
  rangeStart: string;
  rangeEnd: string;
  slots: SlotEntry[];
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function generateSlots(
  rangeStart: string,
  rangeEnd: string,
  durationMin: number,
): SlotEntry[] {
  const slots: SlotEntry[] = [];
  const [sh, sm] = rangeStart.split(":").map(Number);
  const [eh, em] = rangeEnd.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  for (let m = startMin; m + durationMin <= endMin; m += durationMin) {
    const startH = Math.floor(m / 60);
    const startM = m % 60;
    slots.push({
      startTime: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
      endTime: addMinutes(
        `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
        durationMin,
      ),
    });
  }
  return slots;
}

export function ServiceSlotPicker({
  service,
  memberId,
}: ServiceSlotPickerProps) {
  const { data: slotsData, isLoading } = useServiceSlots(service.id, memberId);
  const setSlotsMut = useSetServiceSlots();

  const durationMin = service.durationMin;

  // Per-day configuration
  const [days, setDays] = useState<DayConfig[]>(
    DAYS_HU.map(() => ({
      isEnabled: false,
      rangeStart: "08:00",
      rangeEnd: "17:00",
      slots: [],
    })),
  );

  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState("");

  // Add a custom time slot to a day
  const handleAddCustomSlot = useCallback(
    (dayIdx: number) => {
      if (!customTime) return;
      const endTime = addMinutes(customTime, durationMin);
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== dayIdx) return d;
          // Don't add if already exists
          if (d.slots.some((s) => s.startTime === customTime)) {
            toast.error("Ez az időpont már létezik");
            return d;
          }
          const newSlots = [
            ...d.slots,
            { startTime: customTime, endTime },
          ].sort((a, b) => a.startTime.localeCompare(b.startTime));
          return { ...d, slots: newSlots };
        }),
      );
      setCustomTime("");
    },
    [customTime, durationMin],
  );

  // Load existing slots from server
  useEffect(() => {
    if (!slotsData?.data) return;
    const serverSlots = slotsData.data;

    setDays((prev) =>
      prev.map((day, idx) => {
        const dow = DAY_MAP[idx];
        const daySlots = serverSlots
          .filter((s) => s.dayOfWeek === dow)
          .map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
          }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (daySlots.length === 0) {
          return { ...day, isEnabled: false, slots: [] };
        }

        // Derive range from existing slots
        const rangeStart = daySlots[0].startTime;
        const rangeEnd = daySlots[daySlots.length - 1].endTime;

        return {
          isEnabled: true,
          rangeStart,
          rangeEnd,
          slots: daySlots,
        };
      }),
    );
  }, [slotsData]);

  // When a day is enabled, generate all slots within the range
  const handleToggleDay = useCallback(
    (idx: number) => {
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== idx) return d;
          if (d.isEnabled) {
            return { ...d, isEnabled: false, slots: [] };
          }
          // Enable with all slots
          const slots = generateSlots(d.rangeStart, d.rangeEnd, durationMin);
          return { ...d, isEnabled: true, slots };
        }),
      );
    },
    [durationMin],
  );

  // Update range and regenerate available slots, keeping toggled-off ones
  const handleRangeChange = useCallback(
    (idx: number, field: "rangeStart" | "rangeEnd", value: string) => {
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== idx) return d;
          const updated = { ...d, [field]: value };
          // Regenerate all slots with new range (all enabled by default)
          updated.slots = generateSlots(
            updated.rangeStart,
            updated.rangeEnd,
            durationMin,
          );
          return updated;
        }),
      );
    },
    [durationMin],
  );

  // Toggle an individual slot on/off
  const handleToggleSlot = useCallback(
    (dayIdx: number, startTime: string) => {
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== dayIdx) return d;
          const exists = d.slots.find((s) => s.startTime === startTime);
          if (exists) {
            // Remove the slot
            return {
              ...d,
              slots: d.slots.filter((s) => s.startTime !== startTime),
            };
          } else {
            // Add the slot back
            const endTime = addMinutes(startTime, durationMin);
            const newSlots = [...d.slots, { startTime, endTime }].sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            );
            return { ...d, slots: newSlots };
          }
        }),
      );
    },
    [durationMin],
  );

  // Save all slots
  const handleSave = async () => {
    const allSlots: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }[] = [];

    days.forEach((day, idx) => {
      if (!day.isEnabled) return;
      const dow = DAY_MAP[idx];
      day.slots.forEach((slot) => {
        allSlots.push({
          dayOfWeek: dow,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      });
    });

    try {
      await setSlotsMut.mutateAsync({
        serviceId: service.id,
        memberId,
        slots: allSlots,
      });
      toast.success("Időpontok mentve!");
    } catch {
      toast.error("Hiba az időpontok mentésekor");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4 border-2 border-primary/10">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{service.name} — Időpontok</h4>
          <p className="text-xs text-muted-foreground">
            Kb. {durationMin} perc / alkalom · Kattints az időpontokra a
            ki/bekapcsoláshoz
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={setSlotsMut.isPending}>
          {setSlotsMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Mentés
        </Button>
      </div>

      <div className="space-y-2">
        {DAYS_HU.map((dayName, idx) => {
          const day = days[idx];
          const isExpanded = expandedDay === idx;
          // Generate all possible slots within the range (for rendering toggles)
          const allPossible = generateSlots(
            day.rangeStart,
            day.rangeEnd,
            durationMin,
          );

          // Pre-compute: merge grid + custom slots, track active set
          const gridTimes = new Set(allPossible.map((s) => s.startTime));
          const activeSet = new Set(day.slots.map((s) => s.startTime));
          const customSlots = day.slots.filter(
            (s) => !gridTimes.has(s.startTime),
          );
          const mergedSlots = [...allPossible, ...customSlots].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );

          return (
            <div key={idx} className="border rounded-lg overflow-hidden">
              {/* Day header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedDay(isExpanded ? null : idx)}
              >
                <label
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={day.isEnabled}
                    onChange={() => handleToggleDay(idx)}
                    className="h-4 w-4 rounded"
                  />
                </label>
                <span className="text-sm font-medium w-24">{dayName}</span>
                {day.isEnabled ? (
                  <span className="text-xs text-muted-foreground flex-1">
                    {day.slots.length} időpont ({day.rangeStart} -{" "}
                    {day.rangeEnd})
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex-1">
                    Zárva
                  </span>
                )}
                {day.isEnabled &&
                  (isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ))}
              </div>

              {/* Expanded: range inputs + slot grid */}
              {day.isEnabled && isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                  {/* Time range */}
                  <div className="flex items-center gap-2 pt-3">
                    <Label className="text-xs whitespace-nowrap">
                      Munkaidő:
                    </Label>
                    <Input
                      type="time"
                      value={day.rangeStart}
                      onChange={(e) =>
                        handleRangeChange(idx, "rangeStart", e.target.value)
                      }
                      className="w-28 h-8 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input
                      type="time"
                      value={day.rangeEnd}
                      onChange={(e) =>
                        handleRangeChange(idx, "rangeEnd", e.target.value)
                      }
                      className="w-28 h-8 text-xs"
                    />
                  </div>

                  {/* Slot grid */}
                  <div className="flex flex-wrap gap-1.5">
                    {mergedSlots.map((slot) => {
                      const isActive = activeSet.has(slot.startTime);
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => handleToggleSlot(idx, slot.startTime)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {slot.startTime}–{slot.endTime}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom time slot input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">
                      Egyéni időpont:
                    </Label>
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-28 h-8 text-xs"
                      step="300"
                    />
                    <span className="text-xs text-muted-foreground">
                      →{" "}
                      {customTime
                        ? `${customTime}–${addMinutes(customTime, durationMin)}`
                        : "—"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleAddCustomSlot(idx)}
                      disabled={!customTime}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Hozzáadás
                    </Button>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() =>
                        setDays((prev) =>
                          prev.map((d, i) =>
                            i === idx
                              ? {
                                  ...d,
                                  slots: generateSlots(
                                    d.rangeStart,
                                    d.rangeEnd,
                                    durationMin,
                                  ),
                                }
                              : d,
                          ),
                        )
                      }
                    >
                      Mind bekapcsolása
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() =>
                        setDays((prev) =>
                          prev.map((d, i) =>
                            i === idx ? { ...d, slots: [] } : d,
                          ),
                        )
                      }
                    >
                      Mind kikapcsolása
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
