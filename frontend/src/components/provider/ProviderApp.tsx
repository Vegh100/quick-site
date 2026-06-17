import { useParams, useNavigate, useMatch, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  useMyProvider,
  useProviderStats,
  useProviderBookings,
  useProviderReviews,
  useUpdateBookingStatus,
  useBooking,
  useTeamMembers,
  useStartConversation,
  useRespondToReview,
} from "../../hooks/useApi";
import { HeaderWithSettings } from "../layout/HeaderWithSettings";
import { Footer } from "../layout/Footer";
import { PersonalDashboard, CompanyDashboard } from "../dashboard/CompanyDashboard";
import { ReviewCard } from "../common/ReviewCard";
import { ProviderSettingsPanel } from "../settings/ProviderSettingsPanel";
import { EmployeeProfilePanel } from "../settings/EmployeeProfilePanel";
import { ProviderOnboardingFlow } from "./ProviderOnboardingFlow";
import { ClientManagement } from "../clients/ClientManagement";
import { TeamManagement } from "./TeamManagement";
import { CalendarView } from "../booking/CalendarView";
import { MessagingPage } from "../messaging/MessagingPage";
import { PortfolioManager } from "../portfolio/PortfolioGallery";
import { ExportReportPanel } from "../export/ExportReportPanel";
import { GigManager } from "../gigs/GigManager";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Calendar,
  Clock,
  Loader2,
  LogOut,
  ArrowLeft,
  User,
  MapPin,
  Wrench,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  MessageSquare,
  Image as ImageIcon,
  BarChart3,
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

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.error || fallback;
}

// Provider navigation items
const ownerNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Foglalásaim" },
  { id: "calendar", label: "Naptáram" },
  { id: "gigs", label: "Szolgáltatások" },
  { id: "clients", label: "Ügyfeleim" },
  { id: "team", label: "Csapat" },
  { id: "messages", label: "Üzenetek", icon: MessageSquare },
  { id: "portfolio", label: "Portfólió", icon: ImageIcon },
  { id: "reports", label: "Riportok", icon: BarChart3 },
];

const employeeNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Foglalásaim" },
  { id: "calendar", label: "Naptár" },
  { id: "messages", label: "Üzenetek", icon: MessageSquare },
];

// Map URL segments to internal tab names
const TAB_FROM_URL: Record<string, string> = {
  foglalasok: "bookings",
  naptar: "calendar",
  ugyfelek: "clients",
  szolgaltatasok: "gigs",
  csapat: "team",
  beallitasok: "settings",
  profil: "profile",
  uzenetek: "messages",
  portfolio: "portfolio",
  riportok: "reports",
};
const TAB_TO_URL: Record<string, string> = {
  bookings: "foglalasok",
  calendar: "naptar",
  clients: "ugyfelek",
  gigs: "szolgaltatasok",
  team: "csapat",
  settings: "beallitasok",
  profile: "profil",
  messages: "uzenetek",
  portfolio: "portfolio",
  reports: "riportok",
};

export function ProviderApp() {
  const { tab: urlTab, bookingId } = useParams<{
    tab?: string;
    bookingId?: string;
  }>();
  const bookingMatch = useMatch("/szolgaltato/foglalas/:bookingId");
  const detailBookingId = bookingId || bookingMatch?.params.bookingId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const isOwner = user?.role === "PROVIDER";

  const activeTab = detailBookingId
    ? "booking-detail"
    : urlTab
      ? TAB_FROM_URL[urlTab] || "dashboard"
      : "dashboard";
  const setActiveTab = (tab: string) => {
    if (tab === "dashboard") {
      navigate("/szolgaltato");
    } else {
      navigate(`/szolgaltato/${TAB_TO_URL[tab] || tab}`);
    }
  };

  // API calls
  const {
    data: providerData,
    isLoading: loadingProvider,
    refetch: refetchProvider,
  } = useMyProvider();

  const provider = providerData?.data;

  // Fetch team members to find owner's member ID
  const { data: teamData, isLoading: isLoadingTeam } = useTeamMembers();
  const ownerMemberId = isOwner
    ? (teamData?.data || []).find((m) => m.role === "OWNER")?.id
    : undefined;

  // For owners: wait until team data has loaded (so ownerMemberId is known)
  // This prevents personal tabs from briefly showing company-wide data
  const personalReady = !isOwner || !isLoadingTeam;

  // Personal stats (filtered by owner's member ID for owners)
  const { data: statsData } = useProviderStats(!!provider && personalReady, ownerMemberId);
  // Company-wide stats (no memberId filter)
  const { data: companyStatsData } = useProviderStats(!!provider && isOwner);
  const { data: bookingsData, isLoading: loadingBookings } = useProviderBookings(
    {
      page: 1,
      limit: 20,
      ...(ownerMemberId ? { memberId: ownerMemberId } : {}),
    },
    !!provider && personalReady,
  );
  const { data: reviewsData } = useProviderReviews(provider?.id);
  const respondToReview = useRespondToReview();
  const updateStatus = useUpdateBookingStatus();
  const { data: singleBookingData, isLoading: loadingSingleBooking } = useBooking(detailBookingId);
  const singleBooking = singleBookingData?.data;

  const stats = statsData?.data;
  const companyStats = companyStatsData?.data;
  const bookings = bookingsData?.data?.bookings || [];
  const reviews = reviewsData?.data?.reviews || [];

  const handleStatusUpdate = (bookingId: string, status: string) => {
    updateStatus.mutate(
      { id: bookingId, status },
      {
        onSuccess: () => toast.success("Foglalás állapota frissítve!"),
        onError: (err: unknown) => toast.error(getApiErrorMessage(err, "Hiba történt")),
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

  // If showing settings, render ProviderSettingsPanel (both owner & employee)
  if (activeTab === "settings") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <HeaderWithSettings
          userType="provider"
          isOwner={isOwner}
          onSettingsClick={() => setActiveTab("settings")}
          onProfileClick={() => setActiveTab("profile")}
        />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>{isOwner ? "Üzleti beállítások" : "Beállítások"}</h1>
                <p className="text-muted-foreground">
                  {isOwner ? "Vállalkozásod kezelése" : "Időpontok és profil kezelése"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
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

  // If showing profile, render personal profile panel (both owner & employee)
  if (activeTab === "profile") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <HeaderWithSettings
          userType="provider"
          isOwner={isOwner}
          onSettingsClick={() => setActiveTab("settings")}
          onProfileClick={() => setActiveTab("profile")}
        />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1>Profil beállítások</h1>
                <p className="text-muted-foreground">Személyes adatok kezelése</p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
                Vissza
              </Button>
            </div>

            <EmployeeProfilePanel />
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
        isOwner={isOwner}
        onSettingsClick={() => setActiveTab("settings")}
        onProfileClick={() => setActiveTab("profile")}
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

      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-[#2aa7a5]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Üdvözöljük vissza</p>
                  <h1 className="text-2xl font-bold leading-tight">
                    {user?.firstName
                      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}!`
                      : provider?.businessName || "Dashboard"}
                  </h1>
                  {provider?.businessName && (
                    <p className="text-muted-foreground text-sm">{provider.businessName}</p>
                  )}
                </div>
              </div>
            </div>

            {stats ? (
              <PersonalDashboard stats={stats} />
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-base mb-4">Legutóbbi értékelések</h3>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <ReviewCard
                      key={review.id}
                      reviewId={review.id}
                      customer={`${review.author?.firstName || ""} ${review.author?.lastName || ""}`}
                      rating={review.rating}
                      comment={review.comment || ""}
                      date={new Date(review.createdAt).toLocaleDateString("hu-HU")}
                      service={review.booking?.service?.name || ""}
                      providerResponse={review.providerResponse}
                      providerRespondedAt={review.providerRespondedAt}
                      canRespond={true}
                      onRespond={(id, response) =>
                        respondToReview.mutate({ reviewId: id, response })
                      }
                      isResponding={respondToReview.isPending}
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
              <h1>{isOwner ? "Foglalásaim" : "Foglalások"}</h1>
              <p className="text-muted-foreground">
                {isOwner ? "Saját foglalásaid kezelése" : "Kezelj és erősíts meg foglalásokat"}
              </p>
            </div>

            {loadingBookings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Még nincsenek foglalások</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/szolgaltato/foglalas/${booking.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3>{booking.service?.name || "Szolgáltatás"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.customer?.firstName} {booking.customer?.lastName}
                            {booking.customer?.email ? ` · ${booking.customer.email}` : ""}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(booking.scheduledDate).toLocaleDateString("hu-HU")}
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
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking Detail View */}
        {activeTab === "booking-detail" && detailBookingId && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Vissza
              </Button>
            </div>

            {loadingSingleBooking ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !singleBooking ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">A foglalás nem található</p>
              </Card>
            ) : (
              <>
                {/* Header */}
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-bold">
                        {singleBooking.service?.name || "Foglalás"}
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        Foglalás azonosító:{" "}
                        <span className="font-mono text-xs">{singleBooking.id.slice(0, 8)}...</span>
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[singleBooking.status as BookingStatus]}>
                      {STATUS_HU[singleBooking.status as BookingStatus] || singleBooking.status}
                    </Badge>
                  </div>
                </Card>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date & Time */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Időpont
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dátum</span>
                        <span className="font-medium">
                          {new Date(singleBooking.scheduledDate).toLocaleDateString("hu-HU", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "long",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kezdés</span>
                        <span className="font-medium">{singleBooking.scheduledTime}</span>
                      </div>
                      {singleBooking.scheduledEndTime && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Befejezés</span>
                          <span className="font-medium">{singleBooking.scheduledEndTime}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Időtartam</span>
                        <span className="font-medium">{singleBooking.durationMin} perc</span>
                      </div>
                      <div className="flex justify-between border-t pt-3 mt-1">
                        <span className="text-muted-foreground">Létrehozva</span>
                        <span className="font-medium">
                          {new Date(singleBooking.createdAt).toLocaleDateString("hu-HU", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {singleBooking.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Befejezve</span>
                          <span className="font-medium">
                            {new Date(singleBooking.completedAt).toLocaleDateString("hu-HU", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Customer */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Ügyfél
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Név</span>
                        <span className="font-medium">
                          {singleBooking.customer?.firstName || ""}{" "}
                          {singleBooking.customer?.lastName || ""}
                        </span>
                      </div>
                      {singleBooking.customer?.email && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Email
                          </span>
                          <span className="font-medium">{singleBooking.customer.email}</span>
                        </div>
                      )}
                      {singleBooking.customer?.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Telefon
                          </span>
                          <span className="font-medium">{singleBooking.customer.phone}</span>
                        </div>
                      )}
                    </div>
                    {singleBooking.customer?.id && singleBooking.status !== "CANCELLED" && (
                      <div className="mt-4 pt-4 border-t">
                        <MessageCustomerButton
                          customerId={singleBooking.customer.id}
                          customerName={`${singleBooking.customer?.firstName || ""} ${singleBooking.customer?.lastName || ""}`.trim()}
                          onNavigate={(customerId) =>
                            navigate(`/szolgaltato/uzenetek?userId=${customerId}`)
                          }
                        />
                      </div>
                    )}
                  </Card>

                  {/* Service & Price */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      Szolgáltatás
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Szolgáltatás</span>
                        <span className="font-medium">{singleBooking.service?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ár</span>
                        <span className="font-semibold text-lg">
                          {Number(singleBooking.totalAmount)} {singleBooking.currency}
                        </span>
                      </div>
                      {singleBooking.service?.description && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            {singleBooking.service.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Address */}
                {singleBooking.address && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Helyszín
                    </h3>
                    <p className="text-sm">
                      {[
                        singleBooking.address.city,
                        singleBooking.address.street,
                        singleBooking.address.zipCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </Card>
                )}

                {/* Notes */}
                {singleBooking.notes && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Megjegyzés
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      &bdquo;{singleBooking.notes}&rdquo;
                    </p>
                  </Card>
                )}

                {/* Cancel reason */}
                {singleBooking.cancelReason && (
                  <Card className="p-6 border-red-200 bg-red-50/50">
                    <h3 className="font-semibold mb-2 text-red-700">Lemondás oka</h3>
                    <p className="text-sm text-red-600">{singleBooking.cancelReason}</p>
                  </Card>
                )}

                {/* Actions */}
                {singleBooking.status !== "CANCELLED" && singleBooking.status !== "COMPLETED" && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Műveletek</h3>
                    <div className="flex flex-wrap gap-3">
                      {singleBooking.status === "PENDING" && (
                        <>
                          <Button onClick={() => handleStatusUpdate(singleBooking.id, "CONFIRMED")}>
                            Elfogadás
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate(singleBooking.id, "CANCELLED")}
                          >
                            Elutasítás
                          </Button>
                        </>
                      )}
                      {singleBooking.status === "CONFIRMED" && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(singleBooking.id, "IN_PROGRESS")}
                          >
                            Indítás
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate(singleBooking.id, "CANCELLED")}
                          >
                            Lemondás
                          </Button>
                        </>
                      )}
                      {singleBooking.status === "IN_PROGRESS" && (
                        <Button onClick={() => handleStatusUpdate(singleBooking.id, "COMPLETED")}>
                          Befejezés
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div>
              <h1>{isOwner ? "Naptáram" : "Naptár"}</h1>
              <p className="text-muted-foreground">
                {isOwner ? "Saját foglalásaid naptári nézete" : "Foglalásaid naptári nézete"}
              </p>
            </div>
            {personalReady ? (
              <CalendarView memberId={ownerMemberId} />
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {/* Gigs Tab */}
        {activeTab === "gigs" && (
          <div className="space-y-6">
            <div>
              <h1>Szolgáltatások</h1>
              <p className="text-muted-foreground">Gig Manager</p>
            </div>
            <GigManager />
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div>
              <h1>{isOwner ? "Ügyfeleim" : "Ügyfelek"}</h1>
              <p className="text-muted-foreground">Ügyfélkapcsolatok kezelése</p>
            </div>

            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">Ügyféllistád</TabsTrigger>
                <TabsTrigger value="reviews">Értékelések</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6">
                {personalReady ? (
                  <ClientManagement memberId={ownerMemberId} />
                ) : (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {reviews.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Még nincsenek értékelések</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        reviewId={review.id}
                        customer={`${review.author?.firstName || ""} ${review.author?.lastName || ""}`}
                        rating={review.rating}
                        comment={review.comment || ""}
                        date={new Date(review.createdAt).toLocaleDateString("hu-HU")}
                        service={review.booking?.service?.name || ""}
                        providerResponse={review.providerResponse}
                        providerRespondedAt={review.providerRespondedAt}
                        canRespond={true}
                        onRespond={(id, response) =>
                          respondToReview.mutate({ reviewId: id, response })
                        }
                        isResponding={respondToReview.isPending}
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
              <h1>Csapat & Cég áttekintés</h1>
              <p className="text-muted-foreground">Céges összesítés és csapatkezelés</p>
            </div>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Összesítés</TabsTrigger>
                <TabsTrigger value="calendar">Céges naptár</TabsTrigger>
                <TabsTrigger value="bookings">Összes foglalás</TabsTrigger>
                <TabsTrigger value="clients">Összes ügyfél</TabsTrigger>
                <TabsTrigger value="members">Csapattagok</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                {companyStats ? (
                  <div className="space-y-6">
                    <CompanyDashboard stats={companyStats} />

                    {/* Recent Reviews */}
                    {reviews.length > 0 && (
                      <Card className="p-6">
                        <h3 className="mb-4">Legutóbbi értékelések</h3>
                        <div className="space-y-4">
                          {reviews.slice(0, 3).map((review) => (
                            <ReviewCard
                              key={review.id}
                              reviewId={review.id}
                              customer={`${review.author?.firstName || ""} ${review.author?.lastName || ""}`}
                              rating={review.rating}
                              comment={review.comment || ""}
                              date={new Date(review.createdAt).toLocaleDateString("hu-HU")}
                              service={review.booking?.service?.name || ""}
                              providerResponse={review.providerResponse}
                              providerRespondedAt={review.providerRespondedAt}
                              canRespond={true}
                              onRespond={(id, response) =>
                                respondToReview.mutate({
                                  reviewId: id,
                                  response,
                                })
                              }
                              isResponding={respondToReview.isPending}
                            />
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
                <CalendarView />
              </TabsContent>

              <TabsContent value="bookings" className="mt-6">
                <CompanyBookingsList navigate={navigate} />
              </TabsContent>

              <TabsContent value="clients" className="mt-6">
                <ClientManagement />
              </TabsContent>

              <TabsContent value="members" className="mt-6">
                <TeamManagement provider={provider} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <MessagingPage initialUserId={searchParams.get("userId") ?? undefined} />
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && provider && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1>Portfólió</h1>
                <p className="text-muted-foreground">Munkáid bemutatása</p>
              </div>
            </div>
            <PortfolioManager providerId={provider.id} />
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1>Riportok</h1>
                <p className="text-muted-foreground">Bevételi statisztikák és exportálás</p>
              </div>
            </div>
            <ExportReportPanel />
          </div>
        )}
      </main>

      <Footer />

      <Toaster />
    </div>
  );
}

// ============================================================================
// MESSAGE CUSTOMER BUTTON
// ============================================================================

function MessageCustomerButton({
  customerId,
  customerName,
  onNavigate,
}: {
  customerId: string;
  customerName: string;
  onNavigate: (customerId: string) => void;
}) {
  const startConversation = useStartConversation();

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      disabled={startConversation.isPending}
      onClick={() => {
        startConversation.mutate(customerId, {
          onSuccess: () => onNavigate(customerId),
        });
      }}
    >
      {startConversation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      Üzenet küldése ({customerName || "ügyfél"})
    </Button>
  );
}

// ============================================================================
// COMPANY BOOKINGS LIST (all bookings, no member filter)
// ============================================================================

function CompanyBookingsList({ navigate }: { navigate: (path: string) => void }) {
  const { data: bookingsData, isLoading } = useProviderBookings({ page: 1, limit: 50 }, true);
  const bookings = bookingsData?.data?.bookings || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Még nincsenek foglalások</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card
          key={booking.id}
          className="p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/szolgaltato/foglalas/${booking.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3>{booking.service?.name || "Szolgáltatás"}</h3>
                <p className="text-sm text-muted-foreground">
                  {booking.customer?.firstName} {booking.customer?.lastName}
                  {booking.assignedMember
                    ? ` · ${booking.assignedMember.displayName || `${booking.assignedMember.user?.firstName || ""} ${booking.assignedMember.user?.lastName || ""}`.trim()}`
                    : ""}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(booking.scheduledDate).toLocaleDateString("hu-HU")}
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
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
