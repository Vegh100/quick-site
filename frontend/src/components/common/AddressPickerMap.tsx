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
import {
  geocodingService,
  type AddressDetails,
  type GeocodingSearchResult,
} from "../../services/geocoding";

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

// Re-export so existing consumers don't break
export type { AddressDetails } from "../../services/geocoding";

interface AddressPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onAddressSelect: (address: AddressDetails) => void;
  height?: string;
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
  const [searchResults, setSearchResults] = useState<GeocodingSearchResult[]>(
    [],
  );
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
      const results = await geocodingService.search(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
    }, 400);
  };

  // When search result is selected
  const handleSelectResult = useCallback(
    async (result: GeocodingSearchResult) => {
      setMarkerPos([result.lat, result.lng]);
      setCenter([result.lat, result.lng]);
      setSearchQuery(result.displayName);
      setShowResults(false);

      const a = result.address;
      if (a) {
        onAddressSelect({
          street: a.street,
          city: a.city,
          zipCode: a.zipCode,
          country: a.country,
          latitude: result.lat,
          longitude: result.lng,
          formattedAddress: result.displayName,
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
      const address = await geocodingService.reverseGeocode(lat, lng);
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
        const address = await geocodingService.reverseGeocode(lat, lng);
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
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{result.displayName}</span>
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
