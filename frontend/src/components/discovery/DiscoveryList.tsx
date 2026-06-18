import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ServiceCard } from "../common/ServiceCard";
import { Search, Loader2 } from "lucide-react";
import { useProviderSearch } from "../../hooks/useApi";
import { useCategories } from "../../hooks/useApi";
import { formatServicePrice } from "../../lib/pricing";

export function DiscoveryList() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: searchData, isLoading } = useProviderSearch({
    search: search || undefined,
    categorySlug: categorySlug || undefined,
    limit: 24,
    sortBy: "rating",
    sortOrder: "desc",
  });

  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];
  const providers = searchData?.data?.providers || [];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szolgáltatás keresése..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={categorySlug || "all"}
          onValueChange={(v) => setCategorySlug(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Összes kategória" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes kategória</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.icon ? `${cat.icon} ` : ""}
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : providers.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          Nem találtunk szolgáltatót a keresési feltételek alapján.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => {
            const firstService = provider.services?.[0];
            const serviceImage =
              provider.services?.find((s) => s.imageUrl)?.imageUrl ||
              provider.coverImageUrl ||
              provider.logoUrl ||
              undefined;
            const categoryName =
              provider.categories?.[0]?.category?.name ||
              firstService?.serviceType?.category?.name ||
              "Szolgáltatás";
            const priceLabel = firstService ? formatServicePrice(firstService) : "—";
            return (
              <ServiceCard
                key={provider.id}
                provider={provider.businessName}
                service={
                  firstService?.name ||
                  (provider.services && provider.services.length > 1
                    ? `${provider.services.length} szolgáltatás`
                    : "Szolgáltató")
                }
                rating={Number(provider.rating)}
                reviews={provider.reviewCount}
                price={priceLabel}
                location={provider.city || provider.serviceArea || ""}
                availability={provider.isVerified ? "✓ Ellenőrzött" : ""}
                image={serviceImage ?? undefined}
                category={categoryName}
                onClick={() => navigate(`/ugyfel/szolgaltato/${provider.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
