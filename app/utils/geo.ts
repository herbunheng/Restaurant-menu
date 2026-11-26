import { COUNTRY_COORDINATES } from "../constants/countryCoordinates";

/**
 * Country Code to Emoji Flag Mapping Utility
 * Converts 2-letter ISO Country Code (e.g. 'KH', 'US') to flag emoji dynamically
 */
export function getCountryFlag(countryCode?: string | null): string {
  if (!countryCode || countryCode === "unknown") return "🌐";
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "🌐";
  try {
    return String.fromCodePoint(
      ...code.split("").map((c) => 127397 + c.charCodeAt(0)),
    );
  } catch {
    return "🌐";
  }
}

/**
 * Country Code to Full Country Name Mapping Utility
 * Uses native Web Standard Intl.DisplayNames API for dynamic 250+ country resolution
 */
export function getCountryName(countryCode?: string | null): string {
  if (!countryCode || countryCode === "unknown") return "Unknown";
  const code = countryCode.toUpperCase();
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

/**
 * Returns Latitude & Longitude coordinates for a given country code (used ONLY for Frontend Map Visualization)
 */
export function getCountryCoordinates(countryCode?: string | null): {
  lat: number;
  lng: number;
} {
  if (!countryCode || countryCode === "unknown") return { lat: 20, lng: 0 };
  const code = countryCode.toUpperCase();
  return COUNTRY_COORDINATES[code] || { lat: 20, lng: 0 };
}
