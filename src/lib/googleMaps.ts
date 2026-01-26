import { Loader } from "@googlemaps/js-api-loader";
import { encode, decode } from "@googlemaps/polyline-codec";
import simplify from "simplify-js";
import { GpsPoint, Trip, LatLngBounds } from "@/types";
import { getSettings, saveSettings } from "./storage";

let googleMapsLoader: Loader | null = null;
let isLoaded = false;

export async function loadGoogleMapsAPI(): Promise<typeof google.maps | null> {
  if (isLoaded && window.google?.maps) {
    return window.google.maps;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("Google Maps API key not configured");
    return null;
  }

  try {
    if (!googleMapsLoader) {
      googleMapsLoader = new Loader({
        apiKey,
        version: "weekly",
        libraries: ["places"],
      });
    }

    await googleMapsLoader.load();
    isLoaded = true;
    return window.google.maps;
  } catch (error) {
    console.error("Error loading Google Maps API:", error);
    return null;
  }
}

export function trackApiCall(): void {
  const settings = getSettings();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (!settings.apiUsageMonth || settings.apiUsageMonth.month !== currentMonth) {
    settings.apiUsageMonth = { month: currentMonth, calls: 1 };
  } else {
    settings.apiUsageMonth.calls += 1;
  }
  
  saveSettings(settings);
}

export function checkApiQuota(): { used: number; limit: number; percentage: number; exceeded: boolean } {
  const settings = getSettings();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const used = settings.apiUsageMonth?.month === currentMonth ? settings.apiUsageMonth.calls : 0;
  const limit = 40000;
  const percentage = (used / limit) * 100;
  
  return {
    used,
    limit,
    percentage,
    exceeded: used >= limit,
  };
}

export interface RouteResult {
  distance: number;
  polyline: string;
  bounds: LatLngBounds;
  startAddress: string;
  endAddress: string;
}

export async function calculateRoute(
  start: { lat: number; lng: number } | string,
  end: { lat: number; lng: number } | string
): Promise<RouteResult | null> {
  const quota = checkApiQuota();
  if (quota.exceeded) {
    console.warn("API quota exceeded");
    return null;
  }

  const maps = await loadGoogleMapsAPI();
  if (!maps) return null;

  try {
    trackApiCall();

    const directionsService = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    const result = await directionsService.route(request);
    
    if (!result.routes || result.routes.length === 0) {
      return null;
    }

    const route = result.routes[0];
    const leg = route.legs[0];
    
    if (!leg.distance || !leg.start_address || !leg.end_address) {
      return null;
    }

    const distanceMiles = leg.distance.value / 1609.34;
    const polyline = route.overview_polyline || "";
    
    const bounds: LatLngBounds = {
      northeast: {
        lat: route.bounds?.getNorthEast().lat() || 0,
        lng: route.bounds?.getNorthEast().lng() || 0,
      },
      southwest: {
        lat: route.bounds?.getSouthWest().lat() || 0,
        lng: route.bounds?.getSouthWest().lng() || 0,
      },
    };

    return {
      distance: distanceMiles,
      polyline,
      bounds,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
    };
  } catch (error) {
    console.error("Error calculating route:", error);
    return null;
  }
}

export function decimatePoints(points: GpsPoint[], tolerance: number = 0.0001): GpsPoint[] {
  if (points.length <= 1000) {
    return points;
  }

  if (points.length > 10000) {
    console.warn(`Too many points (${points.length}). Truncating to 10,000 most recent.`);
    points = points.slice(-10000);
  }

  try {
    const simplified = simplify(
      points.map((p) => ({ x: p.lng, y: p.lat, timestamp: p.timestamp })),
      tolerance,
      true
    );

    return simplified.map((p: any) => ({
      lat: p.y,
      lng: p.x,
      timestamp: p.timestamp,
    }));
  } catch (error) {
    console.error("Error decimating points:", error);
    return points.slice(0, 1000);
  }
}

export function encodePolyline(points: GpsPoint[]): string {
  try {
    const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
    return encode(coords);
  } catch (error) {
    console.error("Error encoding polyline:", error);
    return "";
  }
}

let lastRequestTime = 0;
const RATE_LIMIT_MS = 100;

export function getStaticMapUrl(trip: Trip): string | null {
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_MS) {
    return null;
  }
  lastRequestTime = now;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }

  trackApiCall();

  let polyline = "";
  
  if (trip.estimatedRoute && trip.routePolyline) {
    polyline = trip.routePolyline;
  } else if (trip.gpsPoints && trip.gpsPoints.length > 0) {
    const validPoints = trip.gpsPoints.filter(
      (p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== null && p.lng !== null
    );
    
    if (validPoints.length === 0) {
      return null;
    }

    const decimated = decimatePoints(validPoints);
    polyline = encodePolyline(decimated);
  }

  if (!polyline) {
    if (trip.startLocation && trip.endLocation) {
      const markers = `markers=color:green|label:S|${trip.startLocation.lat},${trip.startLocation.lng}&markers=color:red|label:E|${trip.endLocation.lat},${trip.endLocation.lng}`;
      return `https://maps.googleapis.com/maps/api/staticmap?size=640x640&${markers}&key=${apiKey}`;
    }
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/staticmap?size=640x640&path=enc:${polyline}&key=${apiKey}`;
  
  if (url.length > 8192) {
    console.warn("Polyline too long, falling back to markers");
    if (trip.startLocation && trip.endLocation) {
      const markers = `markers=color:green|label:S|${trip.startLocation.lat},${trip.startLocation.lng}&markers=color:red|label:E|${trip.endLocation.lat},${trip.endLocation.lng}`;
      return `https://maps.googleapis.com/maps/api/staticmap?size=640x640&${markers}&key=${apiKey}`;
    }
    return null;
  }

  return url;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const quota = checkApiQuota();
  if (quota.exceeded) {
    return null;
  }

  const maps = await loadGoogleMapsAPI();
  if (!maps) return null;

  try {
    trackApiCall();

    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ address });

    if (!result.results || result.results.length === 0) {
      return null;
    }

    const location = result.results[0].geometry.location;
    return {
      lat: location.lat(),
      lng: location.lng(),
    };
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (lat === 0 && lng === 0) return null;
  
  const quota = checkApiQuota();
  if (quota.exceeded) {
    return null;
  }

  const maps = await loadGoogleMapsAPI();
  if (!maps) return null;

  try {
    trackApiCall();

    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng } });

    if (!result.results || result.results.length === 0) {
      return null;
    }

    // Try to find a street address or neighborhood
    for (const r of result.results) {
      if (r.types.includes("street_address") || r.types.includes("premise")) {
        return r.formatted_address;
      }
    }

    // Fall back to the first result, but try to shorten it
    const first = result.results[0];
    // Get a shorter version - typically the first 2-3 components
    const parts = first.formatted_address.split(", ");
    if (parts.length > 2) {
      return parts.slice(0, 2).join(", ");
    }
    return first.formatted_address;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}

// Simple cache for reverse geocoding to avoid repeated API calls
const geocodeCache = new Map<string, string>();

export async function reverseGeocodeWithCache(lat: number, lng: number): Promise<string | null> {
  if (lat === 0 && lng === 0) return null;
  
  // Round to 4 decimal places for cache key (~11m precision)
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) || null;
  }
  
  const result = await reverseGeocode(lat, lng);
  if (result) {
    geocodeCache.set(key, result);
  }
  return result;
}
