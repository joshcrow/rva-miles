// Address autocomplete, road-distance routing, and reverse geocoding via
// free public OSS services: Photon (photon.komoot.io), OSRM
// (router.project-osrm.org), and Nominatim (nominatim.openstreetmap.org).
// These are shared community demo instances with no API key — fine for one
// person's personal-scale trip logging, but every call here MUST stay
// bounded and fail soft (never throw) so a flaky network never blocks
// logging a trip.

import type { LatLng } from "@/types";
import { db } from "./db";

const FETCH_TIMEOUT_MS = 6000;

export interface PlaceSuggestion {
  name: string;
  address: string;
  latLng: LatLng;
}

// ---------------------------------------------------------------------------
// Photon autocomplete
// ---------------------------------------------------------------------------

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface PhotonFeature {
  properties: PhotonProperties;
  geometry?: { coordinates?: [number, number] }; // GeoJSON order: [lng, lat]
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function assembleAddress(p: PhotonProperties): string {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ");
  return [line1 || undefined, p.city, p.state, p.postcode].filter(Boolean).join(", ");
}

/** Debouncing is the caller's responsibility; this only guards a minimum query length. */
export async function autocomplete(q: string, near?: LatLng): Promise<PlaceSuggestion[]> {
  const query = q.trim();
  if (query.length < 3) return [];

  const params = new URLSearchParams({ q: query, limit: "6" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PhotonResponse;
    const features = data.features ?? [];
    const out: PlaceSuggestion[] = [];
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!coords) continue;
      const [lng, lat] = coords;
      const address = assembleAddress(f.properties);
      out.push({
        name: f.properties.name || f.properties.street || address || "Unnamed location",
        address,
        latLng: { lat, lng },
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// OSRM routing
// ---------------------------------------------------------------------------

interface OsrmRoute {
  distance?: number; // meters
  geometry?: string;
}

interface OsrmResponse {
  routes?: OsrmRoute[];
}

const METERS_PER_MILE = 1609.344;

export async function routeMiles(from: LatLng, to: LatLng): Promise<{ miles: number; polyline?: string } | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmResponse;
    const route = data.routes?.[0];
    if (!route || typeof route.distance !== "number") return null;
    return { miles: route.distance / METERS_PER_MILE, polyline: route.geometry };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nominatim reverse geocoding — cached + rate-limited
// ---------------------------------------------------------------------------

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

function shortAddress(data: NominatimResponse): string | null {
  const a = data.address;
  const road = a?.road || a?.pedestrian;
  const city = a?.city || a?.town || a?.village || a?.hamlet || a?.county;
  const parts = [road, city].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return data.display_name ?? null;
}

function reverseGeocodeCacheKey(p: LatLng): string {
  return `geocode:reverse:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
}

const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimCallAt = 0;
// Every caller chains onto this promise so concurrent reverse-geocode
// requests queue strictly in order, each waiting out the full 1.1s window
// measured from the previous LIVE call (cache hits don't consume the budget).
let nominatimQueueTail: Promise<void> = Promise.resolve();

function waitForNominatimTurn(): Promise<void> {
  const turn = nominatimQueueTail.then(async () => {
    const wait = lastNominatimCallAt + NOMINATIM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimCallAt = Date.now();
  });
  nominatimQueueTail = turn.catch(() => undefined); // keep the chain alive even if a turn errors
  return turn;
}

/**
 * Reverse-geocodes to a short "road, city" string, cached in `db.kv` by
 * coordinate rounded to 4 decimals (~11m) so re-visiting the same spot never
 * re-hits the network. This cache is a nice-to-have, not user data — a
 * failed cache read/write degrades to "just do the live lookup" rather than
 * surfacing an error, unlike trip/route/settings writes elsewhere.
 */
export async function reverseGeocode(p: LatLng): Promise<string | null> {
  const key = reverseGeocodeCacheKey(p);

  try {
    const cached = await db.kv.get(key);
    if (cached && typeof cached.value === "string") return cached.value;
  } catch {
    // fall through to a live lookup
  }

  await waitForNominatimTurn();

  try {
    const params = new URLSearchParams({ format: "jsonv2", lat: String(p.lat), lon: String(p.lng) });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    const short = shortAddress(data);
    if (short) {
      try {
        await db.kv.put({ key, value: short });
      } catch {
        // best-effort cache write; losing it just means the next lookup pays the network cost again
      }
    }
    return short;
  } catch {
    return null;
  }
}
