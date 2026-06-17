import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
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
import { ProviderDetailPage } from "./ProviderDetailPage";
import { BookingDetailPage } from "./BookingDetailPage";
import { MessagingPage } from "../messaging/MessagingPage";
import { Toaster } from "../ui/sonner";
import { toast } from "sonner";
import type { Provider, BookingStatus, Booking, Service } from "../../lib/types";
import { formatServicePrice } from "../../lib/pricing";

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

const TAB_FROM_URL: Record<string, string> = {
  foglalasok: "bookings",
  kedvencek: "favorites",
  beallitasok: "settings",
  tevekenyse: "analytics",
  uzenetek: "messages",
};
const TAB_TO_URL: Record<string, string> = {
  bookings: "foglalasok",
  favorites: "kedvencek",
  settings: "beallitasok",
  analytics: "tevekenyse",
  messages: "uzenetek",
};

function serviceCategory(service: Service) {
  return service.serviceType?.category;
}

function getVisibleServices(provider: Provider, categorySlug: string) {
  const services = provider.services || [];
  if (!categorySlug) return services;

  const filtered = services.filter((service) => serviceCategory(service)?.slug === categorySlug);
  return filtered.length > 0 ? filtered : services;
}

function getLowestPricedService(services: Service[]) {
  return services.reduce<Service | null>((lowest, service) => {
    if (!lowest) return service;
    return Number(service.priceAmount) < Number(lowest.priceAmount) ? service : lowest;
  }, null);
}

function getProviderCategories(services: Service[]) {
  const categories = new Map<string, NonNullable<ReturnType<typeof serviceCategory>>>();
  for (const service of services) {
    const category = serviceCategory(service);
    if (category) categories.set(category.slug, category);
  }
  return [...categories.values()];
}

export function CustomerApp() {
  const {
    tab: urlTab,
    providerId: urlProviderId,
    bookingId: urlBookingId,
  } = useParams<{ tab?: string; providerId?: string; bookingId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detail views are now URL-driven
  const detailProviderId = urlProviderId || null;
  const detailServiceId = searchParams.get("service") || null;
  const detailCategorySlug = searchParams.get("kategoria") || null;
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
  const initialSearch = searchParams.get("kereses") || "";
  const initialCity = searchParams.get("varos") || "";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [cityInput, setCityInput] = useState(initialCity);
  const [cityQuery, setCityQuery] = useState(initialCity);
  const [showFilters, setShowFilters] = useState(false);
  const [bookingTab, setBookingTab] = useState("upcoming");
  const [page, setPage] = useState(1);

  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  // Review dialog
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // API calls
  const { data: categoriesData } = useCategories();
  const { data: providersData, isLoading: loadingProviders } = useProviderSearch({
    categorySlug: selectedCategory || undefined,
    search: searchQuery || undefined,
    city: cityQuery || undefined,
    maxPrice,
    minRating,
    sortBy: "rating",
    sortOrder: "desc",
    page,
    limit: 12,
  });
  const { data: bookingsData, isLoading: loadingBookings } = useCustomerBookings({
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
  const bookings = bookingsData?.data?.bookings || [];
  const favorites = favoritesData?.data || [];
  const favoriteIds = new Set(favorites.map((f) => f.providerId));

  useEffect(() => {
    if (activeTab !== "discover" || detailProviderId || detailBookingId) return;

    const next = new URLSearchParams();
    if (selectedCategory) next.set("kategoria", selectedCategory);
    if (searchQuery) next.set("kereses", searchQuery);
    if (cityQuery) next.set("varos", cityQuery);
    setSearchParams(next, { replace: true });
  }, [
    activeTab,
    cityQuery,
    detailBookingId,
    detailProviderId,
    searchQuery,
    selectedCategory,
    setSearchParams,
  ]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCityQuery(cityInput);
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
    setSelectedCategory("");
    setSearchInput("");
    setSearchQuery("");
    setCityInput("");
    setCityQuery("");
    setMaxPrice(undefined);
    setMinRating(undefined);
    setPage(1);
  };

  // If showing settings, render settings panel
  if (activeTab === "settings") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <HeaderWithSettings userType="customer" onSettingsClick={() => setActiveTab("settings")} />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>Fiókbeállítások</h1>
                <p className="text-muted-foreground">Fiókod és beállításaid kezelése</p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("discover")}>
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
      <HeaderWithSettings userType="customer" onSettingsClick={() => setActiveTab("settings")} />

      {/* Customer Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <TabsTrigger
                value="messages"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Üzenetek
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {/* Booking Detail Page */}
        {detailBookingId ? (
          <ErrorBoundary>
            <BookingDetailPage bookingId={detailBookingId} onBack={() => navigate(-1)} />
          </ErrorBoundary>
        ) : detailProviderId ? (
          <ErrorBoundary>
            <ProviderDetailPage
              providerId={detailProviderId}
              initialServiceId={detailServiceId}
              initialCategorySlug={detailCategorySlug}
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
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Szolgáltatás vagy szolgáltató keresése..."
                      className="pl-10"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Város..."
                      className="pl-10"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
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
                    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <div>
                        <h3 className="mb-3">Max. ár</h3>
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
                      onClick={() => {
                        setSelectedCategory("");
                        setPage(1);
                      }}
                      className="flex-shrink-0"
                    >
                      ✨ Összes
                    </Button>
                    {apiCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.slug ? "default" : "outline"}
                        onClick={() => {
                          setSelectedCategory(category.slug);
                          setPage(1);
                        }}
                        className="flex-shrink-0"
                      >
                        {category.icon && <span className="mr-2">{category.icon}</span>}
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
                        : `${providers.length} szolgáltató található`}
                    </h3>
                  </div>

                  {loadingProviders ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : providers.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Nincs találat. Próbálj más keresési feltételeket!
                      </p>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {providers.map((provider) => {
                        const visibleServices = getVisibleServices(provider, selectedCategory);
                        const categoriesForProvider = getProviderCategories(visibleServices);
                        const primaryService = visibleServices[0];
                        const lowestPricedService = getLowestPricedService(visibleServices);
                        const coverImage = provider.coverImageUrl || primaryService?.imageUrl;

                        return (
                          <Card
                            key={provider.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() =>
                              navigate(
                                `/ugyfel/szolgaltato/${provider.id}${
                                  selectedCategory ? `?kategoria=${selectedCategory}` : ""
                                }`,
                              )
                            }
                          >
                            {coverImage && (
                              <div className="w-full h-28 overflow-hidden">
                                <img
                                  src={coverImage}
                                  alt={provider.businessName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="p-5 space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {categoriesForProvider.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                      {categoriesForProvider.slice(0, 2).map((category) => (
                                        <Badge
                                          key={category.slug}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {category.icon && (
                                            <span className="mr-1">{category.icon}</span>
                                          )}
                                          {category.name}
                                        </Badge>
                                      ))}
                                      {categoriesForProvider.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{categoriesForProvider.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  <h3 className="text-lg font-semibold leading-tight">
                                    {provider.businessName}
                                  </h3>
                                  {(provider.city || provider.serviceArea) && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      {provider.city || provider.serviceArea}
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

                              {(provider.description || primaryService?.description) && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {provider.description || primaryService?.description}
                                </p>
                              )}

                              {visibleServices.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {visibleServices.slice(0, 3).map((service) => (
                                    <Badge key={service.id} variant="secondary" className="text-xs">
                                      {service.name}
                                    </Badge>
                                  ))}
                                  {visibleServices.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{visibleServices.length - 3} további
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-md bg-muted px-3 py-2">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    {Number(provider.rating).toFixed(1)}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {provider.reviewCount} értékelés
                                  </p>
                                </div>
                                <div className="rounded-md bg-muted px-3 py-2">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="h-4 w-4" />
                                    {visibleServices.length}
                                  </div>
                                  <p className="text-xs text-muted-foreground">szolgáltatás</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 border-t pt-4">
                                <div>
                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                    Induló ár
                                  </p>
                                  <p className="text-xl font-bold text-primary">
                                    {lowestPricedService
                                      ? formatServicePrice(lowestPricedService)
                                      : "—"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {provider.isVerified && (
                                    <Badge className="bg-green-500 text-xs flex-shrink-0">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Hitelesített
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/ugyfel/szolgaltato/${provider.id}${
                                          selectedCategory ? `?kategoria=${selectedCategory}` : ""
                                        }`,
                                      );
                                    }}
                                  >
                                    Szolgáltatások
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
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
                  <p className="text-muted-foreground">Kövesd és kezeld a foglalásaidat</p>
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
                        <p className="text-muted-foreground">Nincsenek foglalások</p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <Card
                            key={booking.id}
                            className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => navigate(`/ugyfel/foglalas/${booking.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4">
                                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                                  <Calendar className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3>{booking.service?.name || "Szolgáltatás"}</h3>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {booking.provider?.businessName || "Szolgáltató"}
                                  </p>
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {new Date(booking.scheduledDate).toLocaleDateString("hu-HU")}
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
                                <Badge className={STATUS_COLORS[booking.status]}>
                                  {STATUS_HU[booking.status]}
                                </Badge>
                                <p className="text-sm font-semibold">
                                  {Number(booking.totalAmount)} {booking.currency}
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
                                  (!booking.reviews || booking.reviews.length === 0) && (
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
                  <p className="text-muted-foreground">Az elmentett szolgáltatóid</p>
                </div>

                {loadingFavorites ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : favorites.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Még nincsenek kedvenceid</p>
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
                          <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{Number(p.rating).toFixed(1)}</span>
                            <span className="text-muted-foreground">({p.reviewCount})</span>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => navigate(`/ugyfel/szolgaltato/${p.id}`)}
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
                  <p className="text-muted-foreground">Foglalási előzmények és kiadások</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Összes foglalás</p>
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
                        <p className="text-sm text-muted-foreground">Össz. kiadás</p>
                        <p className="text-2xl">
                          {bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)} RON
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
                        <p className="text-sm text-muted-foreground">Kedvencek</p>
                        <p className="text-2xl">{favorites.length}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "messages" && (
              <MessagingPage initialUserId={searchParams.get("userId") ?? undefined} />
            )}
          </>
        )}
      </main>

      {/* Review Dialog */}
      <Dialog open={!!reviewBooking} onOpenChange={(open) => !open && setReviewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Értékelés írása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {reviewBooking?.service?.name} – {reviewBooking?.provider?.businessName}
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
              <Button onClick={handleSubmitReview} disabled={createReview.isPending}>
                {createReview.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
