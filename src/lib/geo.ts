import { GpsPoint } from "@/types";

const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculate distance between two GPS points using Haversine formula
 */
export function haversineDistance(point1: GpsPoint, point2: GpsPoint): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculate total distance from an array of GPS points
 */
export function calculateTotalDistance(points: GpsPoint[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(points[i - 1], points[i]);
  }

  return totalDistance;
}

/**
 * Filter out GPS points with poor accuracy or that are too close together
 * This helps reduce noise and GPS drift
 */
export function filterGpsPoints(
  points: GpsPoint[],
  minDistanceMeters: number = 10,
  maxAccuracyMeters: number = 50
): GpsPoint[] {
  if (points.length === 0) return [];

  const filtered: GpsPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const lastPoint = filtered[filtered.length - 1];

    // Skip points with poor accuracy
    if (point.accuracy && point.accuracy > maxAccuracyMeters) {
      continue;
    }

    // Skip points that are too close to the last filtered point
    const distanceMeters = haversineDistance(lastPoint, point) * 1609.34; // Convert miles to meters
    if (distanceMeters < minDistanceMeters) {
      continue;
    }

    filtered.push(point);
  }

  return filtered;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    const feet = miles * 5280;
    return `${Math.round(feet)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format duration for display
 */
export function formatDuration(startTime: number, endTime: number | null): string {
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format dollar amount for display
 */
export function formatDollarAmount(miles: number, rate: number): string {
  const amount = miles * rate;
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculate trip reimbursement
 */
export function calculateTripReimbursement(distanceMiles: number, rate: number): number {
  return distanceMiles * rate;
}
