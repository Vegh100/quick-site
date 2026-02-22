/**
 * Shared types for geocoding and map services.
 *
 * These types are map-provider-agnostic. When switching from
 * Leaflet/Nominatim to Google Maps, only the *implementation*
 * files need to change — everything that depends on these types
 * stays untouched.
 */

export interface AddressDetails {
  street: string;
  city: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface GeocodingSearchResult {
  id: string | number;
  displayName: string;
  lat: number;
  lng: number;
  address?: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

/**
 * Provider-agnostic geocoding service interface.
 *
 * Current implementation: Nominatim (OpenStreetMap)
 * Future: Google Geocoding / Places API
 */
export interface GeocodingService {
  /** Reverse geocode: (lat, lng) → address */
  reverseGeocode(lat: number, lng: number): Promise<AddressDetails | null>;

  /** Forward geocode / search: text query → list of results */
  search(query: string): Promise<GeocodingSearchResult[]>;
}

/**
 * Map provider identifier.
 * Extend this union when new providers are added.
 */
export type MapProvider = "leaflet" | "google";
