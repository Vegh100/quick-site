/**
 * Geocoding service barrel export.
 *
 * To switch providers later, just change which implementation
 * is instantiated here. All consumers import from this file
 * and never depend on a concrete class.
 *
 * Example future swap:
 *   import { GoogleGeocodingService } from "./google";
 *   export const geocodingService = new GoogleGeocodingService(API_KEY);
 */

export type { AddressDetails, GeocodingSearchResult, GeocodingService, MapProvider } from "./types";

import { NominatimGeocodingService } from "./nominatim";

/** The singleton geocoding service used throughout the app. */
export const geocodingService = new NominatimGeocodingService();
