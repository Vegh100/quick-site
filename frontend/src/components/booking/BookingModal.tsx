import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { useState, useMemo } from "react";
import {
  useCreateBooking,
  useProvider,
  useAvailableSlots,
} from "../../hooks/useApi";
import { toast } from "sonner";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import type { Provider, TimeSlot } from "../../lib/types";

interface BookingModalProps {
  provider: Provider;
  initialServiceId?: string;
  onClose: () => void;
}

export function BookingModal({
  provider,
  initialServiceId,
  onClose,
}: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState(
    initialServiceId || "",
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [notes, setNotes] = useState("");
  const createBooking = useCreateBooking();

  // Fetch full provider details (search results may lack availability)
  const { data: fullProviderData } = useProvider(provider.id);
  const resolvedProvider = fullProviderData?.data || provider;

  const services = resolvedProvider.services || [];
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Derive availability from all members to disable calendar days
  const availability = useMemo(() => {
    const members = resolvedProvider.members || [];
    const merged = new Map<
      number,
      {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isEnabled: boolean;
      }
    >();
    for (const member of members) {
      for (const a of member.availability || []) {
        if (!a.isEnabled) continue;
        const existing = merged.get(a.dayOfWeek);
        if (!existing) {
          merged.set(a.dayOfWeek, { ...a });
        } else {
          if (a.startTime < existing.startTime)
            existing.startTime = a.startTime;
          if (a.endTime > existing.endTime) existing.endTime = a.endTime;
        }
      }
    }
    return Array.from(merged.values());
  }, [resolvedProvider.members]);

  // Collect days with service slots for the selected service
  const serviceSlotDays = useMemo(() => {
    if (!selectedService?.serviceSlots) return new Set<number>();
    return new Set(selectedService.serviceSlots.map((s) => s.dayOfWeek));
  }, [selectedService]);

  // Fetch available slots from API (all members merged)
  const dateStr = date ? date.toISOString().split("T")[0] : "";
  const slotsParams =
    selectedServiceId && dateStr
      ? {
          providerId: provider.id,
          serviceId: selectedServiceId,
          date: dateStr,
        }
      : null;
  const { data: slotsData, isLoading: loadingSlots } =
    useAvailableSlots(slotsParams);
  const timeSlots: TimeSlot[] = slotsData?.data?.slots || [];

  // Disable days where provider is not available or in the past
  const disabledDays = (checkDate: Date) => {
    if (checkDate < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    const dow = checkDate.getDay();
    // Enable if there are service slots on this day
    if (serviceSlotDays.has(dow)) return false;
    if (availability.length === 0) return false;
    return !availability.some((a) => a.dayOfWeek === dow && a.isEnabled);
  };

  const handleSubmit = () => {
    if (!date || !selectedServiceId || !selectedTime) {
      toast.error("Kérlek töltsd ki az összes mezőt!");
      return;
    }

    const scheduledDate = date.toISOString().split("T")[0];

    createBooking.mutate(
      {
        providerId: provider.id,
        serviceId: selectedServiceId,
        scheduledDate,
        scheduledTime: selectedTime,
        notes: notes || undefined,
        assignedMemberId: selectedMemberId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Foglalás sikeresen létrehozva!");
          onClose();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.error || "Hiba a foglalás létrehozásakor",
          );
        },
      },
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foglalás - {provider.businessName}</DialogTitle>
          <DialogDescription>
            Válaszd ki a szolgáltatást, dátumot és szabad időpontot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service selection */}
          <div>
            <Label>Szolgáltatás</Label>
            <Select
              value={selectedServiceId}
              onValueChange={(v) => {
                setSelectedServiceId(v);
                setSelectedTime("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válassz szolgáltatást" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {Number(service.priceAmount)}{" "}
                    {service.priceCurrency} ({service.durationMin} perc)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member selection when provider has team members */}
          {/* Removed: member pre-selection moved to after time slot pick */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Calendar */}
            <div>
              <Label>Dátum</Label>
              <div className="border rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setSelectedTime("");
                    setSelectedMemberId("");
                  }}
                  className="rounded-md"
                  disabled={disabledDays}
                />
              </div>
            </div>

            {/* Time slots */}
            <div className="space-y-4">
              <div>
                <Label>Elérhető időpontok</Label>
                {!selectedServiceId ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Válassz először szolgáltatást
                  </p>
                ) : !date ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Válassz dátumot az időpontok megjelenítéséhez
                  </p>
                ) : loadingSlots ? (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Időpontok betöltése...
                  </div>
                ) : timeSlots.filter((s) => s.isAvailable).length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nincs elérhető időpont ezen a napon
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-[260px] overflow-y-auto pr-1">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedTime === slot.startTime;
                      const memberCount = slot.availableMembers?.length || 0;
                      return (
                        <button
                          key={slot.startTime}
                          disabled={!slot.isAvailable}
                          onClick={() => {
                            setSelectedTime(isSelected ? "" : slot.startTime);
                            setSelectedMemberId("");
                          }}
                          className={`
                            flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-sm font-medium transition-all
                            ${
                              !slot.isAvailable
                                ? "bg-muted/50 text-muted-foreground/40 border-muted cursor-not-allowed line-through"
                                : isSelected
                                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                                  : "bg-background hover:bg-primary/5 hover:border-primary/50 border-border cursor-pointer"
                            }
                          `}
                        >
                          <Clock className="h-3 w-3" />
                          {slot.startTime}
                          {isSelected && (
                            <CheckCircle2 className="h-3 w-3 ml-0.5" />
                          )}
                          {memberCount > 1 && !isSelected && (
                            <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                              {memberCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Member picker for selected time */}
              {selectedTime &&
                (() => {
                  const selectedSlot = timeSlots.find(
                    (s) => s.startTime === selectedTime,
                  );
                  const slotMembers = selectedSlot?.availableMembers || [];
                  if (slotMembers.length <= 1) return null;
                  return (
                    <div>
                      <Label>Válassz szakembert</Label>
                      <div className="grid grid-cols-1 gap-2 mt-1.5">
                        {slotMembers.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all text-sm ${
                              selectedMemberId === m.id
                                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {m.displayName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-medium">{m.displayName}</span>
                            {selectedMemberId === m.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ha nem választasz, automatikusan lesz hozzárendelve.
                      </p>
                    </div>
                  );
                })()}

              {/* Service summary */}
              {selectedService && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{selectedService.name}</h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    Időtartam: {selectedService.durationMin} perc
                  </p>
                  {selectedTime && (
                    <p className="text-sm text-muted-foreground mb-1">
                      Időpont: {selectedTime} –{" "}
                      {timeSlots.find((s) => s.startTime === selectedTime)
                        ?.endTime || ""}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    {Number(selectedService.priceAmount)}{" "}
                    {selectedService.priceCurrency}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Megjegyzés (opcionális)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Különleges kérés vagy megjegyzés..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Mégse
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={
                createBooking.isPending ||
                !selectedServiceId ||
                !date ||
                !selectedTime
              }
            >
              {createBooking.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Foglalás
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
