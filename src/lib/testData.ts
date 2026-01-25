import { Trip, Vehicle, GpsPoint } from "@/types";
import { getVehicles, saveTrips, getTrips, generateId } from "./storage";

// Richmond, VA area coordinates for realistic test data
const RICHMOND_LOCATIONS = [
  { name: "Downtown", lat: 37.5407, lng: -77.4360 },
  { name: "Short Pump", lat: 37.6501, lng: -77.6122 },
  { name: "Carytown", lat: 37.5555, lng: -77.4914 },
  { name: "Scott's Addition", lat: 37.5677, lng: -77.4711 },
  { name: "Shockoe Bottom", lat: 37.5340, lng: -77.4270 },
  { name: "The Fan", lat: 37.5530, lng: -77.4680 },
  { name: "Museum District", lat: 37.5590, lng: -77.4850 },
  { name: "VCU", lat: 37.5485, lng: -77.4530 },
  { name: "Henrico", lat: 37.6070, lng: -77.4900 },
  { name: "Midlothian", lat: 37.5020, lng: -77.6490 },
];

const TRIP_PURPOSES = [
  "Client meeting",
  "Site visit",
  "Office supplies pickup",
  "Team lunch",
  "Training session",
  "Project review",
  "Vendor meeting",
  "Bank deposit",
  "Equipment delivery",
  "Conference",
  "",
  "",
  "", // Some trips without purpose
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateGpsPoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  durationMinutes: number,
  startTime: number
): GpsPoint[] {
  const points: GpsPoint[] = [];
  const numPoints = Math.floor(durationMinutes * 60 / 3); // One point every 3 seconds

  for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;

    // Add some randomness to simulate real GPS drift
    const jitter = 0.0002;

    points.push({
      lat: start.lat + (end.lat - start.lat) * progress + randomBetween(-jitter, jitter),
      lng: start.lng + (end.lng - start.lng) * progress + randomBetween(-jitter, jitter),
      timestamp: startTime + (i * 3000),
      accuracy: randomBetween(5, 25),
    });
  }

  return points;
}

function generateTrip(
  vehicleId: string,
  date: Date,
  startLocation: { lat: number; lng: number },
  endLocation: { lat: number; lng: number },
  distanceMiles: number
): Trip {
  const startHour = randomBetween(7, 17);
  const startMinute = Math.floor(randomBetween(0, 59));
  const durationMinutes = Math.floor(distanceMiles * randomBetween(2, 4)); // 2-4 min per mile (city traffic)

  const startTime = new Date(date);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const gpsPoints = generateGpsPoints(startLocation, endLocation, durationMinutes, startTime.getTime());

  return {
    id: generateId(),
    vehicleId,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    startLocation: { ...startLocation, timestamp: startTime.getTime() },
    endLocation: { ...endLocation, timestamp: endTime.getTime() },
    gpsPoints,
    distanceMiles: distanceMiles + randomBetween(-0.2, 0.2), // Slight variation
    purpose: TRIP_PURPOSES[Math.floor(Math.random() * TRIP_PURPOSES.length)],
    status: "completed",
    isManualEntry: Math.random() > 0.9, // 10% manual entries
    createdAt: endTime.getTime(),
    updatedAt: endTime.getTime(),
  };
}

export function generateTestTrips(numWeeks: number = 4): Trip[] {
  const vehicles = getVehicles();
  const defaultVehicle = vehicles.find((v) => v.isDefault) || vehicles[0];

  if (!defaultVehicle) {
    throw new Error("No vehicle found. Please add a vehicle first.");
  }

  const trips: Trip[] = [];
  const today = new Date();

  // Generate trips for the past N weeks
  for (let week = 0; week < numWeeks; week++) {
    // 3-5 trips per week (typical work driving)
    const tripsThisWeek = Math.floor(randomBetween(3, 6));

    for (let t = 0; t < tripsThisWeek; t++) {
      // Pick a weekday
      const dayOffset = week * 7 + Math.floor(randomBetween(0, 5)); // Mon-Fri
      const tripDate = new Date(today);
      tripDate.setDate(today.getDate() - dayOffset);

      // Pick random start and end locations
      const startIdx = Math.floor(Math.random() * RICHMOND_LOCATIONS.length);
      let endIdx = Math.floor(Math.random() * RICHMOND_LOCATIONS.length);
      while (endIdx === startIdx) {
        endIdx = Math.floor(Math.random() * RICHMOND_LOCATIONS.length);
      }

      const startLoc = RICHMOND_LOCATIONS[startIdx];
      const endLoc = RICHMOND_LOCATIONS[endIdx];

      // Calculate rough distance (not Haversine, just estimate)
      const latDiff = Math.abs(startLoc.lat - endLoc.lat);
      const lngDiff = Math.abs(startLoc.lng - endLoc.lng);
      const roughDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles
      const distance = Math.max(2, Math.min(15, roughDistance + randomBetween(-2, 2)));

      trips.push(generateTrip(
        defaultVehicle.id,
        tripDate,
        { lat: startLoc.lat, lng: startLoc.lng },
        { lat: endLoc.lat, lng: endLoc.lng },
        distance
      ));
    }
  }

  // Sort by date descending (most recent first)
  trips.sort((a, b) => b.startTime - a.startTime);

  return trips;
}

export function addTestData(numWeeks: number = 4): number {
  const existingTrips = getTrips();
  const newTrips = generateTestTrips(numWeeks);

  // Merge with existing, avoiding duplicates by checking timestamps
  const allTrips = [...newTrips, ...existingTrips];

  saveTrips(allTrips);

  return newTrips.length;
}

export function clearAllData(): void {
  // Keep PIN but clear trips
  const pinHash = localStorage.getItem("rva-miles-pin-hash");
  const pinVerified = localStorage.getItem("rva-miles-pin-verified");

  localStorage.removeItem("rva-miles-trips");
  localStorage.removeItem("rva-miles-active-trip");

  // Restore PIN
  if (pinHash) localStorage.setItem("rva-miles-pin-hash", pinHash);
  if (pinVerified) localStorage.setItem("rva-miles-pin-verified", pinVerified);
}

export function getTestDataSummary(): { totalTrips: number; totalMiles: number; dateRange: string } {
  const trips = getTrips();

  if (trips.length === 0) {
    return { totalTrips: 0, totalMiles: 0, dateRange: "No trips" };
  }

  const totalMiles = trips.reduce((sum, t) => sum + t.distanceMiles, 0);
  const oldest = new Date(Math.min(...trips.map((t) => t.startTime)));
  const newest = new Date(Math.max(...trips.map((t) => t.startTime)));

  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    totalTrips: trips.length,
    totalMiles: Math.round(totalMiles * 10) / 10,
    dateRange: `${formatDate(oldest)} - ${formatDate(newest)}`,
  };
}
