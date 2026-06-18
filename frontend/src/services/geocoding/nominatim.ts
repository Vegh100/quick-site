/**
 * Nominatim (OpenStreetMap) implementation of GeocodingService.
 *
 * Free, no API key needed, rate-limited to 1 req/s.
 * When switching to Google Maps, create a GoogleGeocodingService
 * implementing the same GeocodingService interface and swap the
 * export in ./index.ts — no consumer code changes needed.
 */

import type { AddressDetails, GeocodingSearchResult, GeocodingService } from "./types";

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

const USER_AGENT = "QvickApp/1.0";
const BASE_URL = "https://nominatim.openstreetmap.org";

export class NominatimGeocodingService implements GeocodingService {
  async reverseGeocode(lat: number, lng: number): Promise<AddressDetails | null> {
    try {
      const res = await fetch(
        `${BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=hu`,
        { headers: { "User-Agent": USER_AGENT } },
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

  async search(query: string): Promise<GeocodingSearchResult[]> {
    try {
      const res = await fetch(
        `${BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&accept-language=hu&countrycodes=ro,hu`,
        { headers: { "User-Agent": USER_AGENT } },
      );
      const results: NominatimResult[] = await res.json();
      return results.map((r) => this.toSearchResult(r));
    } catch {
      return [];
    }
  }

  // --------------- helpers ---------------

  private toSearchResult(r: NominatimResult): GeocodingSearchResult {
    const a = r.address;
    return {
      id: r.place_id,
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: a
        ? {
            street: [a.road, a.house_number].filter(Boolean).join(" ") || "",
            city: a.city || a.town || a.village || a.municipality || "",
            zipCode: a.postcode || "",
            country: (a.country_code || "RO").toUpperCase(),
          }
        : undefined,
    };
  }
}
