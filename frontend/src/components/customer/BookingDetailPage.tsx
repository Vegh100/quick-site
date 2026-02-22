import {
  useBooking,
  useUpdateBookingStatus,
  useCreateReview,
} from "../../hooks/useApi";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Briefcase,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus } from "../../lib/types";

const STATUS_COLORS: Record<BookingStatus, string> = {
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

const STATUS_DESCRIPTION: Record<BookingStatus, string> = {
  PENDING:
    "A foglalásodat elküldtük a szolgáltatónak. Várd meg, amíg megerősítik.",
  CONFIRMED: "A foglalásod megerősítve! Jelenj meg az alábbi időpontban.",
  IN_PROGRESS: "A szolgáltatás folyamatban van.",
  COMPLETED: "A szolgáltatás sikeresen befejeződött.",
  CANCELLED: "Ez a foglalás le lett mondva.",
};

interface BookingDetailPageProps {
  bookingId: string;
  onBack: () => void;
}

export function BookingDetailPage({
  bookingId,
  onBack,
}: BookingDetailPageProps) {
  const { data: bookingData, isLoading } = useBooking(bookingId);
  const cancelBooking = useUpdateBookingStatus();
  const createReview = useCreateReview();

  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const booking = bookingData?.data;

  const handleCancel = () => {
    cancelBooking.mutate(
      { id: bookingId, status: "CANCELLED" },
      {
        onSuccess: () => toast.success("Foglalás lemondva!"),
        onError: () => toast.error("Hiba a lemondás során"),
      },
    );
  };

  const handleSubmitReview = async () => {
    if (!booking) return;
    try {
      await createReview.mutateAsync({
        bookingId: booking.id,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      toast.success("Értékelés elküldve!");
      setShowReview(false);
      setReviewRating(5);
      setReviewComment("");
    } catch {
      toast.error("Hiba az értékelés során");
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const provider = booking.provider;
  const service = booking.service;
  const member = booking.assignedMember;
  const memberName = member
    ? member.displayName ||
      `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim() ||
      "Munkatárs"
    : null;

  const canCancel =
    booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canReview =
    booking.status === "COMPLETED" &&
    (!booking.reviews || booking.reviews.length === 0);

  const scheduledDate = new Date(booking.scheduledDate);
  const isPast = scheduledDate < new Date();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Vissza
      </Button>

      {/* Status banner */}
      <Card
        className={`p-6 border-l-4 ${
          booking.status === "PENDING"
            ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
            : booking.status === "CONFIRMED"
              ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : booking.status === "IN_PROGRESS"
                ? "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20"
                : booking.status === "COMPLETED"
                  ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-l-red-500 bg-red-50 dark:bg-red-950/20"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={STATUS_COLORS[booking.status]}>
                {STATUS_HU[booking.status]}
              </Badge>
              {isPast &&
                booking.status !== "CANCELLED" &&
                booking.status !== "COMPLETED" && (
                  <Badge variant="outline" className="text-xs">
                    Lejárt időpont
                  </Badge>
                )}
            </div>
            <p className="text-sm text-muted-foreground">
              {STATUS_DESCRIPTION[booking.status]}
            </p>
          </div>
          {canCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelBooking.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Lemondás
            </Button>
          )}
        </div>
      </Card>

      {/* Booking details */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Foglalás részletei
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Szolgáltatás
              </p>
              <p className="font-medium">{service?.name || "—"}</p>
              {service?.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {service.description}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Dátum és idő
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {scheduledDate.toLocaleDateString("hu-HU", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {booking.scheduledTime}
                  {booking.scheduledEndTime
                    ? ` – ${booking.scheduledEndTime}`
                    : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({booking.durationMin} perc)
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Összeg
              </p>
              <p className="text-2xl font-bold text-primary">
                {Number(booking.totalAmount)} {booking.currency}
              </p>
            </div>
            {booking.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Megjegyzés
                </p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Foglalás azonosító
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                {booking.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Provider info */}
      {provider && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Szolgáltató
          </h2>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {provider.logoUrl ? (
                <img
                  src={provider.logoUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <Briefcase className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{provider.businessName}</h3>
                {provider.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                {provider.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {provider.phone}
                  </div>
                )}
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
                {provider.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.address}
                  </div>
                )}
              </div>
              {provider.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {provider.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Assigned member */}
      {member && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Szakember
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              {member.user?.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{memberName}</h3>
              {member.role === "OWNER" && (
                <span className="text-xs text-muted-foreground">
                  Tulajdonos
                </span>
              )}
            </div>
          </div>

          {/* Chat placeholder for future */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>A chat funkció hamarosan elérhető lesz.</span>
            </div>
          </div>
        </Card>
      )}

      {/* Review section */}
      {canReview && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Értékelés
          </h2>
          {!showReview ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Elégedett voltál a szolgáltatással? Írd meg a véleményed!
              </p>
              <Button onClick={() => setShowReview(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Értékelés írása
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Értékelés</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= reviewRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Vélemény (opcionális)</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Írd le a tapasztalataidat..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowReview(false)}>
                  Mégse
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={createReview.isPending}
                >
                  {createReview.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Értékelés küldése
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Existing review */}
      {booking.reviews && booking.reviews.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Az értékelésed
          </h2>
          {booking.reviews.map((review) => (
            <div key={review.id}>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {new Date(review.createdAt).toLocaleDateString("hu-HU")}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Created at */}
      <p className="text-xs text-muted-foreground text-center">
        Foglalás létrehozva:{" "}
        {new Date(booking.createdAt).toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
