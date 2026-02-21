import { useState } from "react";
import {
  useProvider,
  useProviderReviews,
  useFavorites,
  useToggleFavorite,
} from "../../hooks/useApi";
import { BookingModal } from "../booking/BookingModal";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Star,
  Clock,
  MapPin,
  Heart,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Phone,
  Loader2,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { Provider } from "../../lib/types";

interface ProviderDetailPageProps {
  providerId: string;
  onBack: () => void;
}

const DAY_NAMES = ["Va", "Hé", "Ke", "Sze", "Csü", "Pé", "Szo"];

export function ProviderDetailPage({
  providerId,
  onBack,
}: ProviderDetailPageProps) {
  const { data: providerData, isLoading } = useProvider(providerId);
  const { data: reviewsData } = useProviderReviews(providerId, {
    page: 1,
    limit: 10,
  });
  const { data: favoritesData } = useFavorites();
  const { add: addFav, remove: removeFav } = useToggleFavorite();
  const [showBooking, setShowBooking] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );

  const provider = providerData?.data;
  const reviews = reviewsData?.data?.reviews || [];
  const favorites = favoritesData?.data || [];
  const isFavorite = favorites.some((f) => f.providerId === providerId);

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

  if (isLoading || !provider) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const services = provider.services || [];
  const members = provider.members || [];

  // Merge all member availability to show provider-level schedule
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

      {/* Header / Cover */}
      <div className="relative rounded-xl overflow-hidden">
        {provider.coverImageUrl ? (
          <img
            src={provider.coverImageUrl}
            alt={provider.businessName}
            className="w-full h-48 md:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 md:h-64 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="text-6xl">
              {provider.categories?.[0]?.category?.icon || "🔧"}
            </span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-4 right-4 flex gap-2">
          {provider.isVerified && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Hitelesített
            </Badge>
          )}
        </div>
      </div>

      {/* Provider Info */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{provider.businessName}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">
                    {Number(provider.rating).toFixed(1)}
                  </span>
                  <span>({provider.reviewCount} értékelés)</span>
                </div>
                {provider.serviceArea && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {provider.serviceArea}
                  </div>
                )}
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
            <p className="text-muted-foreground">{provider.description}</p>
          )}

          {/* Categories */}
          {provider.categories && provider.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {provider.categories.map((pc) => (
                <Badge key={pc.category.id} variant="secondary">
                  {pc.category.icon && (
                    <span className="mr-1">{pc.category.icon}</span>
                  )}
                  {pc.category.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {provider.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {provider.phone}
              </div>
            )}
            {provider.website && (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-4 w-4" />
                Weboldal
              </a>
            )}
          </div>
        </div>

        {/* Quick booking CTA */}
        <Card className="p-6 md:w-80 flex-shrink-0">
          <h3 className="font-semibold mb-3">Foglalj időpontot</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Válaszd ki a szolgáltatást és foglalj egy szabad időpontot.
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setSelectedServiceId(null);
              setShowBooking(true);
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Foglalás
          </Button>
        </Card>
      </div>

      {/* Services */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Szolgáltatások</h2>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Még nincsenek szolgáltatások
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="font-bold text-primary">
                      {Number(service.priceAmount)} {service.priceCurrency}
                    </span>
                    {service.priceType === "PER_HOUR" && (
                      <span className="text-xs text-muted-foreground">
                        /óra
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {service.durationMin} perc
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setShowBooking(true);
                  }}
                >
                  Foglalás
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

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

      {/* Booking Modal */}
      {showBooking && (
        <BookingModal
          provider={provider}
          initialServiceId={selectedServiceId || undefined}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}
