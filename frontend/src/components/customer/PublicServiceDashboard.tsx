import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  Car,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Search,
  Star,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCategories, useProviderSearch } from "../../hooks/useApi";
import { formatServicePrice } from "../../lib/pricing";
import type { Category, Provider, Service } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  "house-cleaning": "Lakástakarítás",
  "car-detailing": "Autókozmetika",
};

const categoryIcons: Record<string, typeof Home> = {
  "house-cleaning": Home,
  "car-detailing": Car,
};

function serviceCategory(service: Service) {
  return service.serviceType?.category;
}

function getCategoryDisplayName(category?: Pick<Category, "slug" | "name">) {
  if (!category) return "Szolgáltatás";
  return CATEGORY_LABELS[category.slug] || category.name;
}

function getVisibleServices(provider: Provider, categorySlug: string) {
  const services = provider.services || [];
  if (!categorySlug) return services;

  const filtered = services.filter((service) => serviceCategory(service)?.slug === categorySlug);
  return filtered.length > 0 ? filtered : services;
}

function getProviderCategories(services: Service[]) {
  const categories = new Map<string, NonNullable<ReturnType<typeof serviceCategory>>>();
  for (const service of services) {
    const category = serviceCategory(service);
    if (category) categories.set(category.slug, category);
  }
  return [...categories.values()];
}

function getLowestPricedService(services: Service[]) {
  return services.reduce<Service | null>((lowest, service) => {
    if (!lowest) return service;
    return Number(service.priceAmount) < Number(lowest.priceAmount) ? service : lowest;
  }, null);
}

export function PublicServiceDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("kategoria") || "");
  const [searchInput, setSearchInput] = useState(searchParams.get("kereses") || "");
  const [cityInput, setCityInput] = useState(searchParams.get("varos") || "");
  const [search, setSearch] = useState(searchInput);
  const [city, setCity] = useState(cityInput);

  const { data: categoriesData, isLoading: loadingCategories } = useCategories();
  const { data: providersData, isLoading: loadingProviders } = useProviderSearch({
    categorySlug: selectedCategory || undefined,
    search: search || undefined,
    city: city || undefined,
    limit: 24,
    sortBy: "rating",
    sortOrder: "desc",
  });

  const categories = useMemo(() => {
    return categoriesData?.data || [];
  }, [categoriesData?.data]);

  const providers = useMemo(
    () => providersData?.data?.providers || [],
    [providersData?.data?.providers],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCity(cityInput), 300);
    return () => window.clearTimeout(timer);
  }, [cityInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedCategory) next.set("kategoria", selectedCategory);
    if (search) next.set("kereses", search);
    if (city) next.set("varos", city);
    setSearchParams(next, { replace: true });
  }, [city, search, selectedCategory, setSearchParams]);

  const openProvider = (providerId: string) => {
    const targetSearch = selectedCategory ? `?kategoria=${selectedCategory}` : "";
    const target = {
      pathname: `/ugyfel/szolgaltato/${providerId}`,
      search: targetSearch,
    };

    if (isAuthenticated) {
      if (user?.role !== "CUSTOMER") {
        toast.info("A szolgáltatói részletekhez ügyfél fiókkal kell belépni.");
        return;
      }
      navigate(`${target.pathname}${target.search}`);
      return;
    }

    navigate("/bejelentkezes", {
      state: {
        pendingRole: "CUSTOMER",
        from: target,
      },
    });
  };

  const dashboardPath =
    user?.role === "PROVIDER" || user?.role === "EMPLOYEE" ? "/szolgaltato" : "/ugyfel";

  const showLoading = loadingCategories || loadingProviders;

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-foreground">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button className="flex items-center gap-2 min-w-0" onClick={() => navigate("/")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary">
              <span className="text-white text-xl font-semibold">Q</span>
            </div>
            <span className="font-semibold text-lg">Qvick</span>
          </button>

          {isAuthenticated ? (
            <div className="flex flex-1 sm:flex-none items-center justify-end gap-2 min-w-full sm:min-w-0">
              <Button className="h-9 px-3" onClick={() => navigate(dashboardPath)}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Irányítópult</span>
              </Button>
              <Button
                variant="outline"
                className="h-9 bg-white px-3"
                onClick={async () => {
                  await logout();
                  navigate("/", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Kilépés</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 sm:flex-none items-center justify-end gap-2 min-w-full sm:min-w-0">
              <Button
                variant="outline"
                className="h-9 bg-white px-3"
                onClick={() => navigate("/bejelentkezes")}
              >
                Belépés
              </Button>
              <Button
                variant="outline"
                className="h-9 bg-white px-3"
                onClick={() => navigate("/regisztracio/ugyfel")}
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden md:inline">Ügyfél </span>Regisztráció
              </Button>
              <Button className="h-9 px-3" onClick={() => navigate("/regisztracio/szolgaltato")}>
                <Briefcase className="h-4 w-4" />
                <span className="hidden md:inline">Vállalkozásoknak</span>
                <span className="md:hidden">Vállalkozás</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-[#f7f7f5] to-[#f7f7f5] border-b">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <Badge className="mb-5 bg-tertiary text-tertiary-foreground border-transparent hover:bg-tertiary">
            Lakástakarítás és autókozmetika
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Találd meg a legjobb <span className="text-primary">helyi szolgáltatókat</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Böngészd a megbízható helyi vállalkozásokat, nézd meg az árakat és az értékeléseket.
            Foglaláshoz ingyenes regisztráció szükséges.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>4.9/5 átlagos értékelés</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Helyi szolgáltatók</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Azonnali foglalás regisztráció után</span>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <section className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-stretch">
          <div className="relative overflow-hidden rounded-lg border bg-white p-5 md:p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-[#2aa7a5]" />
            <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 md:items-end">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Keresés és szűrés</h2>
                <p className="text-sm text-muted-foreground">
                  Válassz szolgáltatót, majd a profilján szolgáltatást.
                </p>
              </div>

              <div className="rounded-md border bg-[#fff8ef] p-3 text-sm">
                <p className="font-semibold text-foreground">{providers.length}</p>
                <p className="text-muted-foreground">látható szolgáltató</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_120px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Keresés szolgáltatóra vagy szolgáltatásra..."
                  className="h-11 pl-10 bg-white"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  value={cityInput}
                  onChange={(event) => setCityInput(event.target.value)}
                  placeholder="Város..."
                  className="h-11 pl-10 bg-white"
                />
              </div>
              <Button
                className="h-11"
                onClick={() => {
                  setSearch(searchInput);
                  setCity(cityInput);
                }}
              >
                Keresés
              </Button>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="rounded-md border bg-[#f0fdf4] p-3">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-700" />
                  <p className="font-medium text-green-950">Lakástakarítás</p>
                </div>
                <p className="mt-1 text-sm text-green-800">
                  Lakások, nagyobb házak, alap- és mélytakarítás.
                </p>
              </div>
              <div className="rounded-md border bg-[#eef6ff] p-3">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-700" />
                  <p className="font-medium text-blue-950">Autókozmetika</p>
                </div>
                <p className="mt-1 text-sm text-blue-800">
                  Külső mosás, belső tisztítás, mély belső takarítás.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Szolgáltatás</p>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {categories.length} típus
              </span>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("")}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition-colors ${
                  selectedCategory === ""
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <span className="font-medium">Összes</span>
                <span className="text-sm opacity-80">{providers.length}</span>
              </button>

              {categories.map((category) => {
                const Icon = categoryIcons[category.slug] || Home;
                const selected = selectedCategory === category.slug;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{getCategoryDisplayName(category)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Szolgáltatók</h2>
              <p className="text-sm text-muted-foreground">
                Egy cég egyszer jelenik meg, a szolgáltatásokat a profilján választhatod ki.
              </p>
            </div>
          </div>

          {showLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : providers.length === 0 ? (
            <Card className="p-8 text-center bg-white border-dashed">
              <p className="text-muted-foreground">Ehhez a kereséshez még nincs szolgáltató.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {providers.map((provider) => {
                const visibleServices = getVisibleServices(provider, selectedCategory);
                const categoriesForProvider = getProviderCategories(visibleServices);
                const primaryCategory = categoriesForProvider[0];
                const CategoryIcon = categoryIcons[primaryCategory?.slug || ""] || Home;
                const primaryService = visibleServices[0];
                const lowestPricedService = getLowestPricedService(visibleServices);
                const coverImage = provider.coverImageUrl || primaryService?.imageUrl;

                return (
                  <Card
                    key={provider.id}
                    className="overflow-hidden bg-white border shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openProvider(provider.id)}
                  >
                    <div className="h-36 relative overflow-hidden bg-[#fff8ef]">
                      {coverImage ? (
                        <ImageWithFallback
                          src={coverImage}
                          alt={provider.businessName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`h-full w-full flex items-center justify-center ${
                            primaryCategory?.slug === "car-detailing"
                              ? "bg-[#eef6ff]"
                              : "bg-[#f0fdf4]"
                          }`}
                        >
                          <CategoryIcon className="h-14 w-14 text-primary/70" />
                        </div>
                      )}
                      {primaryCategory && (
                        <Badge className="absolute left-3 top-3 bg-white text-foreground border shadow-sm hover:bg-white">
                          {primaryCategory.icon && (
                            <span className="mr-1">{primaryCategory.icon}</span>
                          )}
                          {getCategoryDisplayName(primaryCategory)}
                          {categoriesForProvider.length > 1 && (
                            <span className="ml-1 text-muted-foreground">
                              +{categoriesForProvider.length - 1}
                            </span>
                          )}
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold leading-snug">
                          {provider.businessName}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          {visibleServices.length} hirdetett szolgáltatás
                        </p>
                      </div>

                      {(provider.description || primaryService?.description) && (
                        <p className="min-h-10 text-sm text-muted-foreground line-clamp-2">
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
                            <Briefcase className="h-4 w-4" />
                            {visibleServices.length}
                          </div>
                          <p className="text-xs text-muted-foreground">szolgáltatás</p>
                        </div>
                        <div className="col-span-2 rounded-md bg-muted px-3 py-2">
                          <div className="flex items-center gap-1.5 font-medium min-w-0">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {provider.city || provider.serviceArea || "Helyi szolgáltató"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t pt-4">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Induló ár
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {lowestPricedService ? formatServicePrice(lowestPricedService) : "—"}
                          </p>
                        </div>
                        <Button
                          className="h-11 shrink-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            openProvider(provider.id);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                          Részletek
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
