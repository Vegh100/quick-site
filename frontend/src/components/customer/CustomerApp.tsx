import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  useProviderSearch,
  useCategories,
  useCustomerBookings,
  useFavorites,
  useToggleFavorite,
  useUpdateBookingStatus,
  useCreateReview,
} from "../../hooks/useApi";
import { HeaderWithSettings } from "../layout/HeaderWithSettings";
import { Footer } from "../layout/Footer";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Search,
  Star,
  Clock,
  MapPin,
  SlidersHorizontal,
  Heart,
  Calendar,
  CheckCircle2,
  DollarSign,
  XCircle,
  Loader2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { CustomerSettingsPanel } from "../settings/CustomerSettingsPanel";
import { BookingModal } from "../booking/BookingModal";
import { ProviderDetailPage } from "./ProviderDetailPage";
import { BookingDetailPage } from "./BookingDetailPage";
import { Toaster } from "../ui/sonner";
import { toast } from "sonner";
import type {
  Provider,
  BookingStatus,
  Booking,
  Service,
} from "../../lib/types";

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

// Map URL segments to internal tab names
const TAB_FROM_URL: Record<string, string> = {
  foglalasok: "bookings",
  kedvencek: "favorites",
  beallitasok: "settings",
  tevekenyse: "analytics",
};
const TAB_TO_URL: Record<string, string> = {
  bookings: "foglalasok",
  favorites: "kedvencek",
  settings: "beallitasok",
  analytics: "tevekenyse",
};

export function CustomerApp() {
  const {
    tab: urlTab,
    providerId: urlProviderId,
    bookingId: urlBookingId,
  } = useParams<{ tab?: string; providerId?: string; bookingId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // Detail views are now URL-driven
  const detailProviderId = urlProviderId || null;
  const detailServiceId = searchParams.get("service") || null;
  const detailBookingId = urlBookingId || null;

  const activeTab = urlTab ? TAB_FROM_URL[urlTab] || "discover" : "discover";
  const setActiveTab = (tab: string) => {
    if (tab === "discover") {
      navigate("/ugyfel");
    } else {
      navigate(`/ugyfel/${TAB_TO_URL[tab] || tab}`);
    }
  };

  const initialCategory = searchParams.get("kategoria") || "";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const [bookingTab, setBookingTab] = useState("upcoming");
  const [page, setPage] = useState(1);

  // Filter state
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Review dialog
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // API calls
  const { data: categoriesData } = useCategories();
  const { data: providersData, isLoading: loadingProviders } =
    useProviderSearch({
      categorySlug: selectedCategory || undefined,
      search: searchQuery || undefined,
      maxPrice,
      minRating,
      sortBy,
      sortOrder,
      page,
      limit: 12,
    });
  const { data: bookingsData, isLoading: loadingBookings } =
    useCustomerBookings({
      status:
        bookingTab === "upcoming"
          ? "PENDING,CONFIRMED,IN_PROGRESS"
          : bookingTab === "past"
            ? "COMPLETED"
            : "CANCELLED",
      page: 1,
      limit: 20,
    });
  const { data: favoritesData, isLoading: loadingFavorites } = useFavorites();
  const { add: addFav, remove: removeFav } = useToggleFavorite();
  const cancelBooking = useUpdateBookingStatus();
  const createReview = useCreateReview();

  const apiCategories = categoriesData?.data || [];
  const providers = providersData?.data?.providers || [];
  const providersMeta = providersData?.data?.meta;
  const serviceItems = providers.flatMap((provider: Provider) =>
    (provider.services || []).map((service: Service) => ({
      service,
      provider,
    })),
  );
  const bookings = bookingsData?.data?.bookings || [];
  const favorites = favoritesData?.data || [];
  const favoriteIds = new Set(favorites.map((f) => f.providerId));

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const toggleFavorite = (providerId: string) => {
    if (favoriteIds.has(providerId)) {
      removeFav.mutate(providerId, {
        onSuccess: () => toast.success("Eltávolítva a kedvencekből"),
      });
    } else {
      addFav.mutate(providerId, {
        onSuccess: () => toast.success("Hozzáadva a kedvencekhez"),
      });
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    cancelBooking.mutate(
      { id: bookingId, status: "CANCELLED" },
      {
        onSuccess: () => toast.success("Foglalás lemondva!"),
        onError: () => toast.error("Hiba a lemondás során"),
      },
    );
  };

  const handleSubmitReview = async () => {
    if (!reviewBooking) return;
    try {
      await createReview.mutateAsync({
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      toast.success("Értékelés elküldve!");
      setReviewBooking(null);
      setReviewRating(5);
      setReviewComment("");
    } catch {
      toast.error("Hiba az értékelés során");
    }
  };

  const clearFilters = () => {
    setMaxPrice(undefined);
    setMinRating(undefined);
    setSortBy(undefined);
    setSortOrder("desc");
    setPage(1);
  };

  // If showing settings, render settings panel
  if (activeTab === "settings") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <HeaderWithSettings
          userType="customer"
          onSettingsClick={() => setActiveTab("settings")}
        />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>Fiókbeállítások</h1>
                <p className="text-muted-foreground">
                  Fiókod és beállításaid kezelése
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("discover")}
              >
                Vissza
              </Button>
            </div>

            <CustomerSettingsPanel />
          </div>
        </main>

        <Footer />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderWithSettings
        userType="customer"
        onSettingsClick={() => setActiveTab("settings")}
      />

      {/* Customer Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start h-12 bg-transparent border-0 rounded-none">
              <TabsTrigger
                value="discover"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Felfedezés
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Foglalásaim
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Kedvencek
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Tevékenység
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Booking Detail Page */}
        {detailBookingId ? (
          <ErrorBoundary>
            <BookingDetailPage
              bookingId={detailBookingId}
              onBack={() => navigate(-1)}
            />
          </ErrorBoundary>
        ) : detailProviderId ? (
          <ErrorBoundary>
            <ProviderDetailPage
              providerId={detailProviderId}
              initialServiceId={detailServiceId}
              onBack={() => navigate(-1)}
              onBookingCreated={(bookingId) => {
                navigate(`/ugyfel/foglalas/${bookingId}`, { replace: true });
              }}
            />
          </ErrorBoundary>
        ) : (
          <>
            {/* Discovery Tab */}
            {activeTab === "discover" && (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Szolgáltatás vagy szolgáltató keresése..."
                      className="pl-10"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch}>
                    <Search className="h-5 w-5 mr-2" />
                    Keresés
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-primary text-white" : ""}
                  >
                    <SlidersHorizontal className="h-5 w-5 mr-2" />
                    Szűrők
                  </Button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <Card className="p-6">
                    <div className="grid md:grid-cols-4 gap-6">
                      <div>
                        <h3 className="mb-3">Max. ár (RON/óra)</h3>
                        <div className="space-y-2">
                          {[
                            { label: "Bármennyi", value: undefined },
                            { label: "Max 50 RON", value: 50 },
                            { label: "Max 100 RON", value: 100 },
                            { label: "Max 200 RON", value: 200 },
                          ].map((opt) => (
                            <label
                              key={opt.label}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="maxPrice"
                                className="h-4 w-4"
                                checked={maxPrice === opt.value}
                                onChange={() => {
                                  setMaxPrice(opt.value);
                                  setPage(1);
                                }}
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3">Min. értékelés</h3>
                        <div className="space-y-2">
                          {[
                            { label: "Bármennyi", value: undefined },
                            { label: "4.5+ csillag", value: 4.5 },
                            { label: "4.0+ csillag", value: 4.0 },
                            { label: "3.0+ csillag", value: 3.0 },
                          ].map((opt) => (
                            <label
                              key={opt.label}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="minRating"
                                className="h-4 w-4"
                                checked={minRating === opt.value}
                                onChange={() => {
                                  setMinRating(opt.value);
                                  setPage(1);
                                }}
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3">Rendezés</h3>
                        <div className="space-y-2">
                          {[
                            {
                              label: "Értékelés szerint",
                              sortBy: "rating",
                              sortOrder: "desc" as const,
                            },
                            {
                              label: "Ár (növekvő)",
                              sortBy: "price",
                              sortOrder: "asc" as const,
                            },
                            {
                              label: "Ár (csökkenő)",
                              sortBy: "price",
                              sortOrder: "desc" as const,
                            },
                            {
                              label: "Legújabb",
                              sortBy: "newest",
                              sortOrder: "desc" as const,
                            },
                          ].map((opt) => (
                            <label
                              key={opt.label}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="sortBy"
                                className="h-4 w-4"
                                checked={
                                  sortBy === opt.sortBy &&
                                  sortOrder === opt.sortOrder
                                }
                                onChange={() => {
                                  setSortBy(opt.sortBy);
                                  setSortOrder(opt.sortOrder);
                                  setPage(1);
                                }}
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button variant="outline" onClick={clearFilters}>
                          Szűrők törlése
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Categories */}
                <div>
                  <h3 className="mb-4">Kategóriák</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    <Button
                      variant={selectedCategory === "" ? "default" : "outline"}
                      onClick={() => setSelectedCategory("")}
                      className="flex-shrink-0"
                    >
                      ✨ Összes
                    </Button>
                    {apiCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={
                          selectedCategory === category.slug
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedCategory(category.slug)}
                        className="flex-shrink-0"
                      >
                        {category.icon && (
                          <span className="mr-2">{category.icon}</span>
                        )}
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Results */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3>
                      {loadingProviders
                        ? "Keresés..."
                        : `${serviceItems.length} szolgáltatás található`}
                    </h3>
                  </div>

                  {loadingProviders ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : serviceItems.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Nincs találat. Próbálj más keresési feltételeket!
                      </p>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {serviceItems.map(({ service, provider }) => (
                        <Card
                          key={`${provider.id}-${service.id}`}
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => {
                            navigate(
                              `/ugyfel/szolgaltato/${provider.id}?service=${service.id}`,
                            );
                          }}
                        >
                          <div className="p-5 space-y-3">
                            {/* Category badge + favorite */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                {service.serviceType?.category && (
                                  <Badge
                                    variant="secondary"
                                    className="mb-2 text-xs"
                                  >
                                    {service.serviceType.category.icon && (
                                      <span className="mr-1">
                                        {service.serviceType.category.icon}
                                      </span>
                                    )}
                                    {service.serviceType.category.name}
                                  </Badge>
                                )}
                                <h3 className="text-lg font-semibold leading-tight">
                                  {service.name}
                                </h3>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mt-1 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(provider.id);
                                }}
                              >
                                <Heart
                                  className={`h-4 w-4 ${favoriteIds.has(provider.id) ? "fill-red-500 text-red-500" : ""}`}
                                />
                              </Button>
                            </div>

                            {/* Price - prominent */}
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-bold text-primary">
                                {Number(service.priceAmount)}{" "}
                                {service.priceCurrency}
                              </span>
                              {service.priceType === "PER_HOUR" && (
                                <span className="text-sm text-muted-foreground">
                                  /óra
                                </span>
                              )}
                            </div>

                            {/* Rating + Duration */}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">
                                  {Number(provider.rating).toFixed(1)}
                                </span>
                                <span className="text-muted-foreground">
                                  ({provider.reviewCount})
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {service.durationMin} perc
                              </div>
                            </div>

                            {/* Provider info - secondary */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground truncate">
                                  {provider.businessName}
                                </p>
                                {(provider.city || provider.serviceArea) && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {provider.city || provider.serviceArea}
                                  </p>
                                )}
                              </div>
                              {provider.isVerified && (
                                <Badge className="bg-green-500 text-xs flex-shrink-0">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Hitelesített
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {providersMeta && providersMeta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Előző
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {page} / {providersMeta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= providersMeta.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Következő
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My Bookings Tab */}
            {activeTab === "bookings" && (
              <div className="space-y-6">
                <div>
                  <h1>Foglalásaim</h1>
                  <p className="text-muted-foreground">
                    Kövesd és kezeld a foglalásaidat
                  </p>
                </div>

                <Tabs value={bookingTab} onValueChange={setBookingTab}>
                  <TabsList>
                    <TabsTrigger value="upcoming">Közelgő</TabsTrigger>
                    <TabsTrigger value="past">Korábbi</TabsTrigger>
                    <TabsTrigger value="cancelled">Lemondott</TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    {loadingBookings ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : bookings.length === 0 ? (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                          Nincsenek foglalások
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <Card
                            key={booking.id}
                            className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() =>
                              navigate(`/ugyfel/foglalas/${booking.id}`)
                            }
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4">
                                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                                  <Calendar className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3>
                                    {booking.service?.name || "Szolgáltatás"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {booking.provider?.businessName ||
                                      "Szolgáltató"}
                                  </p>
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {new Date(
                                        booking.scheduledDate,
                                      ).toLocaleDateString("hu-HU")}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {booking.scheduledTime}
                                      {booking.scheduledEndTime
                                        ? ` – ${booking.scheduledEndTime}`
                                        : ""}
                                    </div>
                                  </div>
                                  {booking.assignedMember && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                      <User className="h-4 w-4" />
                                      Szakember:{" "}
                                      {booking.assignedMember.displayName ||
                                        `${booking.assignedMember.user?.firstName || ""} ${booking.assignedMember.user?.lastName || ""}`.trim() ||
                                        "—"}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <Badge
                                  className={STATUS_COLORS[booking.status]}
                                >
                                  {STATUS_HU[booking.status]}
                                </Badge>
                                <p className="text-sm font-semibold">
                                  {Number(booking.totalAmount)}{" "}
                                  {booking.currency}
                                </p>
                                {/* Cancel button for PENDING/CONFIRMED */}
                                {(booking.status === "PENDING" ||
                                  booking.status === "CONFIRMED") && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      handleCancelBooking(booking.id);
                                    }}
                                    disabled={cancelBooking.isPending}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Lemondás
                                  </Button>
                                )}
                                {/* Review button for COMPLETED (hide if already reviewed) */}
                                {booking.status === "COMPLETED" &&
                                  (!booking.reviews ||
                                    booking.reviews.length === 0) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setReviewBooking(booking);
                                        setReviewRating(5);
                                        setReviewComment("");
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      Értékelés
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === "favorites" && (
              <div className="space-y-6">
                <div>
                  <h1>Kedvenc szolgáltatók</h1>
                  <p className="text-muted-foreground">
                    Az elmentett szolgáltatóid
                  </p>
                </div>

                {loadingFavorites ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : favorites.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Még nincsenek kedvenceid
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Kattints a szív ikonra a szolgáltatóknál
                    </p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((fav) => {
                      const p = fav.provider;
                      if (!p) return null;
                      return (
                        <Card
                          key={fav.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow p-5"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg">{p.businessName}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 -mt-1"
                              onClick={() => toggleFavorite(p.id)}
                            >
                              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {p.description}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{Number(p.rating).toFixed(1)}</span>
                            <span className="text-muted-foreground">
                              ({p.reviewCount})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() =>
                              navigate(`/ugyfel/szolgaltato/${p.id}`)
                            }
                          >
                            Részletek
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div>
                  <h1>Tevékenységed</h1>
                  <p className="text-muted-foreground">
                    Foglalási előzmények és kiadások
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Összes foglalás
                        </p>
                        <p className="text-2xl">{bookings.length}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                        <DollarSign className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Össz. kiadás
                        </p>
                        <p className="text-2xl">
                          {bookings.reduce(
                            (sum, b) => sum + Number(b.totalAmount),
                            0,
                          )}{" "}
                          RON
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <Heart className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Kedvencek
                        </p>
                        <p className="text-2xl">{favorites.length}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Booking Modal */}
      {bookingProvider && (
        <BookingModal
          provider={bookingProvider}
          onClose={() => setBookingProvider(null)}
        />
      )}

      {/* Review Dialog */}
      <Dialog
        open={!!reviewBooking}
        onOpenChange={(open) => !open && setReviewBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Értékelés írása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {reviewBooking?.service?.name} –{" "}
                {reviewBooking?.provider?.businessName}
              </p>
            </div>
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
                      className={`h-7 w-7 ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
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
              <Button variant="outline" onClick={() => setReviewBooking(null)}>
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
        </DialogContent>
      </Dialog>

      <Footer />
      <Toaster />
    </div>
  );
}
