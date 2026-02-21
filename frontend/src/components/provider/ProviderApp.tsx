import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  useMyProvider,
  useProviderStats,
  useProviderBookings,
  useProviderClients,
  useProviderReviews,
  useUpdateBookingStatus,
} from "../../hooks/useApi";
import { HeaderWithSettings } from "../layout/HeaderWithSettings";
import { Footer } from "../layout/Footer";
import { RevenueChart } from "../dashboard/RevenueChart";
import { ReviewCard } from "../common/ReviewCard";
import { PaywallModal } from "../pricing/PaywallModal";
import { ReferralModal } from "../common/ReferralModal";
import { ProviderSettingsPanel } from "../settings/ProviderSettingsPanel";
import { ProviderOnboardingFlow } from "./ProviderOnboardingFlow";
import { ClientManagement } from "../clients/ClientManagement";
import { TeamManagement } from "./TeamManagement";
import { CalendarView } from "../booking/CalendarView";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Plus,
  Gift,
  CreditCard,
  Calendar,
  Clock,
  Loader2,
  Star,
  LogOut,
} from "lucide-react";
import { Toaster } from "../ui/sonner";
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

// Provider navigation items
const ownerNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Foglalások" },
  { id: "calendar", label: "Naptár" },
  { id: "clients", label: "Ügyfelek" },
  { id: "team", label: "Csapat" },
];

const employeeNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Foglalásaim" },
  { id: "calendar", label: "Naptár" },
];

// Map URL segments to internal tab names
const TAB_FROM_URL: Record<string, string> = {
  foglalasok: "bookings",
  naptar: "calendar",
  ugyfelek: "clients",
  csapat: "team",
  beallitasok: "settings",
};
const TAB_TO_URL: Record<string, string> = {
  bookings: "foglalasok",
  calendar: "naptar",
  clients: "ugyfelek",
  team: "csapat",
  settings: "beallitasok",
};

export function ProviderApp() {
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isOwner = user?.role === "PROVIDER";

  const activeTab = urlTab ? TAB_FROM_URL[urlTab] || "dashboard" : "dashboard";
  const setActiveTab = (tab: string) => {
    if (tab === "dashboard") {
      navigate("/szolgaltato");
    } else {
      navigate(`/szolgaltato/${TAB_TO_URL[tab] || tab}`);
    }
  };

  const [paywallModalOpen, setPaywallModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);

  // API calls
  const {
    data: providerData,
    isLoading: loadingProvider,
    refetch: refetchProvider,
  } = useMyProvider();

  const provider = providerData?.data;

  // These queries only run once we know a provider profile exists
  const { data: statsData } = useProviderStats(!!provider);
  const { data: bookingsData, isLoading: loadingBookings } =
    useProviderBookings({ page: 1, limit: 20 }, !!provider);
  const { data: clientsData } = useProviderClients(1, 20, !!provider);
  const { data: reviewsData } = useProviderReviews(provider?.id);
  const updateStatus = useUpdateBookingStatus();

  const stats = statsData?.data;
  const bookings = bookingsData?.data?.bookings || [];
  const reviews = reviewsData?.data?.reviews || [];

  const handleStatusUpdate = (bookingId: string, status: string) => {
    updateStatus.mutate(
      { id: bookingId, status },
      {
        onSuccess: () => toast.success("Foglalás állapota frissítve!"),
        onError: (err: any) =>
          toast.error(err?.response?.data?.error || "Hiba történt"),
      },
    );
  };

  if (loadingProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no provider profile yet, show onboarding
  if (!provider) {
    return (
      <ProviderOnboardingFlow
        onComplete={() => {
          refetchProvider();
        }}
        onBack={() => {
          logout();
        }}
      />
    );
  }

  // If showing settings, render settings panel
  if (activeTab === "settings") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <HeaderWithSettings
          userType="provider"
          onSettingsClick={() => setActiveTab("settings")}
        />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>Üzleti beállítások</h1>
                <p className="text-muted-foreground">Vállalkozásod kezelése</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Vissza
              </Button>
            </div>

            <ProviderSettingsPanel />
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
        userType="provider"
        onSettingsClick={() => setActiveTab("settings")}
      />

      {/* Provider Navigation */}
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {(isOwner ? ownerNavItems : employeeNavItems).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="ml-auto flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate("/", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Kijelentkezés
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>Dashboard</h1>
                <p className="text-muted-foreground">
                  {provider?.businessName || "Vállalkozásod áttekintése"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReferralModalOpen(true)}
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Ajánlás
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPaywallModalOpen(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Csomag
                </Button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Összes bevétel
                  </p>
                  <p className="text-2xl font-bold">{stats.totalRevenue} RON</p>
                </Card>
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">Foglalások</p>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingBookings} függőben
                  </p>
                </Card>
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">Ügyfelek</p>
                  <p className="text-2xl font-bold">{stats.totalClients}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">Értékelés</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {stats.averageRating.toFixed(1)}
                    </p>
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalReviews} értékelés
                  </p>
                </Card>
              </div>
            )}

            {/* Revenue Chart (uses API via stats.revenueByMonth) */}
            {stats?.revenueByMonth && (
              <RevenueChart data={stats.revenueByMonth} />
            )}

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4">Legutóbbi értékelések</h3>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <ReviewCard
                      key={review.id}
                      customer={`${review.author?.firstName || ""} ${review.author?.lastName || ""}`}
                      rating={review.rating}
                      comment={review.comment || ""}
                      date={new Date(review.createdAt).toLocaleDateString(
                        "hu-HU",
                      )}
                      service=""
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div>
              <h1>Foglalások</h1>
              <p className="text-muted-foreground">
                Kezelj és erősíts meg foglalásokat
              </p>
            </div>

            {loadingBookings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Még nincsenek foglalások
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3>{booking.service?.name || "Szolgáltatás"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.customer?.firstName}{" "}
                            {booking.customer?.lastName}
                            {booking.customer?.email
                              ? ` · ${booking.customer.email}`
                              : ""}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                booking.scheduledDate,
                              ).toLocaleDateString("hu-HU")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.scheduledTime}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {Number(booking.totalAmount)} {booking.currency}
                        </span>
                        <Badge className={STATUS_COLORS[booking.status]}>
                          {STATUS_HU[booking.status] || booking.status}
                        </Badge>
                        {booking.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(booking.id, "CONFIRMED")
                              }
                            >
                              Elfogadás
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleStatusUpdate(booking.id, "CANCELLED")
                              }
                            >
                              Elutasítás
                            </Button>
                          </div>
                        )}
                        {booking.status === "CONFIRMED" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(booking.id, "IN_PROGRESS")
                              }
                            >
                              Indítás
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleStatusUpdate(booking.id, "CANCELLED")
                              }
                            >
                              Lemondás
                            </Button>
                          </div>
                        )}
                        {booking.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(booking.id, "COMPLETED")
                            }
                          >
                            Befejezés
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div>
              <h1>Naptár</h1>
              <p className="text-muted-foreground">
                Foglalásaid naptári nézete
              </p>
            </div>
            <CalendarView />
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div>
              <h1>Ügyfelek</h1>
              <p className="text-muted-foreground">
                Ügyfélkapcsolatok kezelése
              </p>
            </div>

            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">Ügyféllistád</TabsTrigger>
                <TabsTrigger value="reviews">Értékelések</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6">
                <ClientManagement />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {reviews.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Még nincsenek értékelések
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        customer={`${review.author?.firstName || ""} ${review.author?.lastName || ""}`}
                        rating={review.rating}
                        comment={review.comment || ""}
                        date={new Date(review.createdAt).toLocaleDateString(
                          "hu-HU",
                        )}
                        service=""
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <div>
              <h1>Csapat</h1>
              <p className="text-muted-foreground">
                Alkalmazottak és csapattagok kezelése
              </p>
            </div>
            <TeamManagement provider={provider} />
          </div>
        )}
      </main>

      <Footer />

      {/* Modals */}
      <PaywallModal
        open={paywallModalOpen}
        onOpenChange={setPaywallModalOpen}
      />
      <ReferralModal
        open={referralModalOpen}
        onOpenChange={setReferralModalOpen}
      />
      <Toaster />
    </div>
  );
}
