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
import { useCreateBooking, useProvider } from "../../hooks/useApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Provider } from "../../lib/types";

interface BookingModalProps {
  provider: Provider;
  onClose: () => void;
}

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export function BookingModal({ provider, onClose }: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [notes, setNotes] = useState("");
  const createBooking = useCreateBooking();

  // Fetch full provider details (search results may lack availability)
  const { data: fullProviderData } = useProvider(provider.id);
  const resolvedProvider = fullProviderData?.data || provider;

  const services = resolvedProvider.services || [];
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const availability = resolvedProvider.availability || [];

  // Get time slots for the selected date based on provider availability
  const timeSlots = useMemo(() => {
    if (!date) return [];
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...6=Sat
    const dayAvail = availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isEnabled,
    );
    if (dayAvail) {
      return generateTimeSlots(dayAvail.startTime, dayAvail.endTime);
    }
    // Fallback: if no availability data at all, show default slots
    if (availability.length === 0) {
      return generateTimeSlots("08:00", "18:00");
    }
    return []; // Provider not available on this day
  }, [date, availability]);

  // Disable days where provider is not available
  const disabledDays = (checkDate: Date) => {
    if (checkDate < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (availability.length === 0) return false;
    const dow = checkDate.getDay();
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
            Válaszd ki a szolgáltatást, dátumot és időpontot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Szolgáltatás</Label>
            <Select
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válassz szolgáltatást" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {Number(service.priceAmount)}{" "}
                    {service.priceCurrency}
                    {service.priceType === "PER_HOUR" ? "/óra" : ""} (
                    {service.durationMin} perc)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member selection for COMPANY providers */}
          {resolvedProvider.providerType === "COMPANY" &&
            resolvedProvider.members &&
            resolvedProvider.members.length > 0 && (
              <div>
                <Label>Szakember kiválasztása</Label>
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz szakembert (opcionális)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Bárki</SelectItem>
                    {resolvedProvider.members.map((member) => {
                      const name =
                        member.displayName ||
                        `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim() ||
                        "Munkatárs";
                      return (
                        <SelectItem key={member.id} value={member.id}>
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dátum</Label>
              <div className="border rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setSelectedTime("");
                  }}
                  className="rounded-md"
                  disabled={disabledDays}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Időpont</Label>
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    A szolgáltató ezen a napon nem elérhető
                  </p>
                ) : (
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz időpontot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedService && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{selectedService.name}</h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    Időtartam: {selectedService.durationMin} perc
                  </p>
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
              disabled={createBooking.isPending}
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
