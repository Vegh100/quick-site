import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { toast } from "sonner";

// Fix default marker icon (leaflet CSS issue with bundlers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface AddressDetails {
  street: string;
  city: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    country_code?: string;
    county?: string;
    state?: string;
  };
}

interface AddressPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onAddressSelect: (address: AddressDetails) => void;
  height?: string;
}

// Reverse geocode: coordinates → address
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<AddressDetails | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=hu`,
      { headers: { "User-Agent": "QvickApp/1.0" } },
    );
    const data: NominatimResult = await res.json();
    if (!data.address) return null;

    const a = data.address;
    const street = [a.road, a.house_number].filter(Boolean).join(" ") || "";
    const city = a.city || a.town || a.village || a.municipality || "";
    const zipCode = a.postcode || "";
    const country = (a.country_code || "RO").toUpperCase();

    return {
      street,
      city,
      zipCode,
      country,
      latitude: lat,
      longitude: lng,
      formattedAddress: data.display_name,
    };
  } catch {
    return null;
  }
}

// Forward geocode: search text → results
async function searchAddress(query: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&accept-language=hu&countrycodes=ro,hu`,
      { headers: { "User-Agent": "QvickApp/1.0" } },
    );
    return await res.json();
  } catch {
    return [];
  }
}

// Sub-component: handle map click events
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component: recenter map programmatically
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function AddressPickerMap({
  initialLat,
  initialLng,
  onAddressSelect,
  height = "300px",
}: AddressPickerMapProps) {
  // Default center: Cluj-Napoca, Romania
  const defaultLat = initialLat || 46.7712;
  const defaultLng = initialLng || 23.6236;

  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  );
  const [center, setCenter] = useState<[number, number]>([
    defaultLat,
    defaultLng,
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
    }, 400);
  };

  // When search result is selected
  const handleSelectResult = useCallback(
    async (result: NominatimResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      setMarkerPos([lat, lng]);
      setCenter([lat, lng]);
      setSearchQuery(result.display_name);
      setShowResults(false);

      const a = result.address;
      if (a) {
        const street = [a.road, a.house_number].filter(Boolean).join(" ") || "";
        const city = a.city || a.town || a.village || a.municipality || "";
        const zipCode = a.postcode || "";
        const country = (a.country_code || "RO").toUpperCase();

        onAddressSelect({
          street,
          city,
          zipCode,
          country,
          latitude: lat,
          longitude: lng,
          formattedAddress: result.display_name,
        });
      }
    },
    [onAddressSelect],
  );

  // When map is clicked → reverse geocode
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      setMarkerPos([lat, lng]);
      setGeocoding(true);
      const address = await reverseGeocode(lat, lng);
      setGeocoding(false);
      if (address) {
        setSearchQuery(address.formattedAddress);
        onAddressSelect(address);
      }
    },
    [onAddressSelect],
  );

  // Use browser geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("A böngésző nem támogatja a helymeghatározást");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarkerPos([lat, lng]);
        setCenter([lat, lng]);
        setGeocoding(true);
        const address = await reverseGeocode(lat, lng);
        setGeocoding(false);
        setLocating(false);
        if (address) {
          setSearchQuery(address.formattedAddress);
          onAddressSelect(address);
        }
      },
      () => {
        setLocating(false);
        toast.error("Nem sikerült meghatározni a helyzetet");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      {/* Search + geolocation row */}
      <div className="flex gap-2">
        <div className="relative flex-1" ref={resultsRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cím keresése..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowResults(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-[1000] w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          title="Saját helyzet"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {geocoding && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Cím feloldása...
        </p>
      )}

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapRecenter lat={center[0]} lng={center[1]} />
          {markerPos && <Marker position={markerPos} />}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Kattints a térképre vagy keress rá egy címre a pontos helyzet
        megadásához
      </p>
    </div>
  );
}
