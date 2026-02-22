import { useState, useMemo } from "react";
import {
  useProvider,
  useProviderReviews,
  useFavorites,
  useToggleFavorite,
  useAvailableSlots,
  useCreateBooking,
} from "../../hooks/useApi";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Calendar as CalendarWidget } from "../ui/calendar";
import {
  Star,
  Clock,
  MapPin,
  Heart,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { Provider, TimeSlot } from "../../lib/types";

interface ProviderDetailPageProps {
  providerId: string;
  initialServiceId?: string | null;
  onBack: () => void;
  onBookingCreated?: (bookingId: string) => void;
}

const DAY_NAMES = ["Va", "Hé", "Ke", "Sze", "Csü", "Pé", "Szo"];

export function ProviderDetailPage({
  providerId,
  initialServiceId,
  onBack,
  onBookingCreated,
}: ProviderDetailPageProps) {
  const { data: providerData, isLoading } = useProvider(providerId);
  const { data: reviewsData } = useProviderReviews(providerId, {
    page: 1,
    limit: 10,
  });
  const { data: favoritesData } = useFavorites();
  const { add: addFav, remove: removeFav } = useToggleFavorite();
  const createBooking = useCreateBooking();

  // Featured service state
  const [featuredServiceId, setFeaturedServiceId] = useState<string | null>(
    initialServiceId || null,
  );

  // Booking state (inline)
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  const provider = providerData?.data;
  const reviews = reviewsData?.data?.reviews || [];
  const favorites = favoritesData?.data || [];
  const isFavorite = favorites.some((f) => f.providerId === providerId);

  const services = provider?.services || [];
  const members = provider?.members || [];

  // Featured service (from initialServiceId or first service)
  const featuredService = useMemo(() => {
    if (!services.length) return null;
    if (featuredServiceId) {
      return services.find((s) => s.id === featuredServiceId) || services[0];
    }
    return services[0];
  }, [services, featuredServiceId]);

  const otherServices = useMemo(() => {
    if (!featuredService) return services;
    return services.filter((s) => s.id !== featuredService.id);
  }, [services, featuredService]);

  // Members who handle the featured service
  const serviceMembers = useMemo(() => {
    if (!featuredService) return [];
    return members.filter((m: any) =>
      m.memberServices?.some((ms: any) => ms.serviceId === featuredService.id),
    );
  }, [members, featuredService]);

  // Calendar disabled days: merge all service members' availability + service slot days
  const disabledDays = useMemo(() => {
    const enabledSet = new Set<number>();
    // Enable days from availability records
    for (const m of serviceMembers) {
      for (const a of m.availability || []) {
        if ((a as any).isEnabled) enabledSet.add((a as any).dayOfWeek);
      }
    }
    // Also enable days that have service slots for the featured service
    if (featuredService?.serviceSlots) {
      for (const slot of featuredService.serviceSlots) {
        enabledSet.add(slot.dayOfWeek);
      }
    }
    return (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !enabledSet.has(date.getDay()) || date < today;
    };
  }, [serviceMembers, featuredService]);

  // Fetch available time slots (all members merged)
  const dateStr = bookingDate ? bookingDate.toISOString().split("T")[0] : "";
  const slotsParams =
    featuredService && dateStr
      ? {
          providerId,
          serviceId: featuredService.id,
          date: dateStr,
        }
      : null;
  const { data: slotsData, isLoading: slotsLoading } =
    useAvailableSlots(slotsParams);
  const slotsPayload = slotsData?.data;
  const timeSlots: TimeSlot[] = Array.isArray(slotsPayload)
    ? slotsPayload
    : (slotsPayload as any)?.slots || [];

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFav.mutate(providerId, {
        onSuccess: () => toast.success("Eltávolítva a kedvencekből"),
      });
    } else {
      addFav.mutate(providerId, {
        onSuccess: () => toast.success("Hozzáadva a kedvencekhez"),
      });
    }
  };

  // Handle booking submit
  const handleBooking = () => {
    if (!featuredService || !bookingDate || !selectedTime) {
      toast.error("Kérlek válassz dátumot és időpontot!");
      return;
    }
    createBooking.mutate(
      {
        providerId,
        serviceId: featuredService.id,
        scheduledDate: bookingDate.toISOString().split("T")[0],
        scheduledTime: selectedTime,
        notes: bookingNotes || undefined,
        assignedMemberId: selectedMemberId || undefined,
      },
      {
        onSuccess: (data: any) => {
          toast.success("Foglalás sikeresen létrehozva!");
          setBookingDate(undefined);
          setSelectedTime("");
          setSelectedMemberId("");
          setBookingNotes("");
          // Navigate to booking detail
          const bookingId = data?.data?.id;
          if (bookingId && onBookingCreated) {
            onBookingCreated(bookingId);
          }
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.error || "Hiba történt a foglalásnál",
          );
        },
      },
    );
  };

  if (isLoading || !provider) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Merge availability for the overview section
  const mergedAvailability = new Map<
    number,
    { startTime: string; endTime: string }
  >();
  for (const member of members) {
    for (const a of member.availability || []) {
      if (!a.isEnabled) continue;
      const existing = mergedAvailability.get(a.dayOfWeek);
      if (!existing) {
        mergedAvailability.set(a.dayOfWeek, {
          startTime: a.startTime,
          endTime: a.endTime,
        });
      } else {
        if (a.startTime < existing.startTime) existing.startTime = a.startTime;
        if (a.endTime > existing.endTime) existing.endTime = a.endTime;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Vissza a kereséshez
      </Button>

      {/* Provider header – compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xl">
              {provider.categories?.[0]?.category?.icon || "🔧"}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-lg">{provider.businessName}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">
                  {Number(provider.rating).toFixed(1)}
                </span>
                <span>({provider.reviewCount})</span>
              </div>
              {(provider.city || provider.serviceArea) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.city
                    ? [provider.city, provider.county]
                        .filter(Boolean)
                        .join(", ")
                    : provider.serviceArea}
                </div>
              )}
              {provider.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Hitelesített
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFavorite}
          className="h-10 w-10"
        >
          <Heart
            className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
          />
        </Button>
      </div>

      {provider.description && (
        <p className="text-sm text-muted-foreground -mt-2">
          {provider.description}
        </p>
      )}

      {/* Featured Service + Inline Booking */}
      {featuredService && (
        <Card className="p-0 overflow-hidden">
          <div className="grid md:grid-cols-5 gap-0">
            {/* Service info – left 2/5 */}
            <div className="md:col-span-2 p-6 bg-primary/5 border-b md:border-b-0 md:border-r">
              {featuredService.serviceType?.category && (
                <Badge variant="secondary" className="mb-3">
                  {featuredService.serviceType.category.icon && (
                    <span className="mr-1">
                      {featuredService.serviceType.category.icon}
                    </span>
                  )}
                  {featuredService.serviceType.category.name}
                </Badge>
              )}
              <h2 className="text-xl font-bold mb-2">{featuredService.name}</h2>
              {featuredService.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {featuredService.description}
                </p>
              )}
              <div className="text-3xl font-bold text-primary mb-1">
                {Number(featuredService.priceAmount)}{" "}
                {featuredService.priceCurrency}
              </div>
              {featuredService.priceType === "PER_HOUR" && (
                <span className="text-sm text-muted-foreground">/óra</span>
              )}
              <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {featuredService.durationMin} perc
              </div>

              {serviceMembers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Elérhető szakembereink:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {serviceMembers.map((m: any) => {
                      const mName =
                        m.displayName ||
                        `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim() ||
                        "Munkatárs";
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <div className="h-6 w-6 bg-muted rounded-full flex items-center justify-center">
                            {m.user?.avatarUrl ? (
                              <img
                                src={m.user.avatarUrl}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <span>{mName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Booking form – right 3/5 */}
            <div className="md:col-span-3 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Időpont foglalás
              </h3>

              {/* Calendar */}
              <div className="mb-4">
                <Label className="text-sm mb-1.5 block">Dátum</Label>
                <CalendarWidget
                  mode="single"
                  selected={bookingDate}
                  onSelect={(d: Date | undefined) => {
                    setBookingDate(d);
                    setSelectedTime("");
                    setSelectedMemberId("");
                  }}
                  disabled={disabledDays}
                  className="rounded-md border w-fit"
                />
              </div>

              {/* Time slots */}
              {bookingDate && (
                <div className="mb-4">
                  <Label className="text-sm mb-1.5 block">Időpont</Label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Időpontok betöltése...
                    </div>
                  ) : timeSlots.filter((s: TimeSlot) => s.isAvailable)
                      .length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Nincs elérhető időpont ezen a napon.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {timeSlots
                        .filter((s: TimeSlot) => s.isAvailable)
                        .map((slot: TimeSlot) => {
                          const memberCount =
                            slot.availableMembers?.length || 0;
                          return (
                            <Button
                              key={slot.startTime}
                              size="sm"
                              variant={
                                selectedTime === slot.startTime
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs gap-1.5"
                              onClick={() => {
                                setSelectedTime(slot.startTime);
                                setSelectedMemberId("");
                              }}
                            >
                              {slot.startTime}
                              {memberCount > 1 && (
                                <span
                                  className={`text-[10px] rounded-full h-4 w-4 flex items-center justify-center shrink-0 ${
                                    selectedTime === slot.startTime
                                      ? "bg-primary-foreground/20 text-primary-foreground"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  {memberCount}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Member picker – shown after time selection */}
              {selectedTime &&
                (() => {
                  const selectedSlot = timeSlots.find(
                    (s: TimeSlot) => s.startTime === selectedTime,
                  );
                  const slotMembers = selectedSlot?.availableMembers || [];
                  if (slotMembers.length <= 1) {
                    // Auto-select the only member (or let backend auto-assign)
                    return null;
                  }
                  return (
                    <div className="mb-4">
                      <Label className="text-sm mb-1.5 block">
                        Válassz szakembert
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slotMembers.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                              selectedMemberId === m.id
                                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm font-medium">
                              {m.displayName}
                            </span>
                            {selectedMemberId === m.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Ha nem választasz, automatikusan lesz hozzárendelve.
                      </p>
                    </div>
                  );
                })()}

              {/* Notes */}
              {selectedTime && (
                <div className="mb-4">
                  <Label className="text-sm mb-1.5 block">
                    Megjegyzés (opcionális)
                  </Label>
                  <Textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Írd le, ha van speciális kérésed..."
                    rows={2}
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                className="w-full"
                size="lg"
                disabled={
                  !bookingDate || !selectedTime || createBooking.isPending
                }
                onClick={handleBooking}
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Foglalás...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Foglalás megerősítése
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Other Services */}
      {otherServices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Más szolgáltatások ettől a cégtől
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((service) => {
              const svcMembers = members.filter((m: any) =>
                m.memberServices?.some(
                  (ms: any) => ms.serviceId === service.id,
                ),
              );
              return (
                <Card
                  key={service.id}
                  className="p-4 hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setFeaturedServiceId(service.id);
                    setBookingDate(undefined);
                    setSelectedTime("");
                    setSelectedMemberId("");
                    setBookingNotes("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {service.serviceType?.category && (
                        <Badge variant="secondary" className="mb-1.5 text-xs">
                          {service.serviceType.category.icon && (
                            <span className="mr-1">
                              {service.serviceType.category.icon}
                            </span>
                          )}
                          {service.serviceType.category.name}
                        </Badge>
                      )}
                      <h3 className="font-medium text-sm">{service.name}</h3>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="font-bold text-primary">
                        {Number(service.priceAmount)} {service.priceCurrency}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.durationMin} perc
                    </div>
                    {svcMembers.length > 0 && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {svcMembers.length} szakember
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability Overview */}
      {mergedAvailability.size > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Nyitvatartás</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const avail = mergedAvailability.get(day);
              return (
                <div
                  key={day}
                  className={`p-3 rounded-lg border text-center ${avail ? "bg-primary/5 border-primary/20" : "bg-muted/50"}`}
                >
                  <div className="font-medium text-sm">{DAY_NAMES[day]}</div>
                  {avail ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      {avail.startTime} – {avail.endTime}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      Zárva
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Team */}
      {members.length > 1 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Csapatunk</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {members.map((member) => {
              const name =
                member.displayName ||
                `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim() ||
                "Munkatárs";
              return (
                <div
                  key={member.id}
                  className="flex flex-col items-center text-center p-3"
                >
                  <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center mb-2">
                    {member.user?.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={name}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                  {member.role === "OWNER" && (
                    <span className="text-xs text-muted-foreground">
                      Tulajdonos
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Reviews */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Értékelések ({provider.reviewCount})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Még nincsenek értékelések
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                    {review.author?.avatarUrl ? (
                      <img
                        src={review.author.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-sm">
                      {review.author?.firstName || ""}{" "}
                      {review.author?.lastName || ""}
                    </span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {new Date(review.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground ml-11">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
