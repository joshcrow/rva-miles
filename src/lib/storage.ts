import { Vehicle, Trip, UserSettings, AppState } from "@/types";

const STORAGE_KEYS = {
  VEHICLES: "rva-miles-vehicles",
  TRIPS: "rva-miles-trips",
  ACTIVE_TRIP: "rva-miles-active-trip",
  SETTINGS: "rva-miles-settings",
} as const;

// Default vehicle from PRD
const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "default-vehicle-1",
    name: "2014 Subaru Outback",
    make: "Subaru",
    model: "Outback",
    year: 2014,
    isDefault: true,
    createdAt: Date.now(),
  },
];

const DEFAULT_SETTINGS: UserSettings = {
  nextPayDate: null,
  payFrequency: null,
};

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// Vehicles
export function getVehicles(): Vehicle[] {
  const vehicles = getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
  // Return default vehicles if none exist
  if (vehicles.length === 0) {
    setItem(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    return DEFAULT_VEHICLES;
  }
  return vehicles;
}

export function saveVehicles(vehicles: Vehicle[]): void {
  setItem(STORAGE_KEYS.VEHICLES, vehicles);
}

export function addVehicle(vehicle: Vehicle): Vehicle[] {
  const vehicles = getVehicles();
  // If this is the first vehicle or marked as default, unset other defaults
  if (vehicle.isDefault || vehicles.length === 0) {
    vehicles.forEach((v) => (v.isDefault = false));
    vehicle.isDefault = true;
  }
  vehicles.push(vehicle);
  saveVehicles(vehicles);
  return vehicles;
}

export function updateVehicle(vehicle: Vehicle): Vehicle[] {
  const vehicles = getVehicles();
  const index = vehicles.findIndex((v) => v.id === vehicle.id);
  if (index !== -1) {
    // Handle default vehicle logic
    if (vehicle.isDefault) {
      vehicles.forEach((v) => (v.isDefault = false));
    }
    vehicles[index] = vehicle;
    saveVehicles(vehicles);
  }
  return vehicles;
}

export function deleteVehicle(id: string): Vehicle[] {
  let vehicles = getVehicles().filter((v) => v.id !== id);
  // Ensure at least one default vehicle
  if (vehicles.length > 0 && !vehicles.some((v) => v.isDefault)) {
    vehicles[0].isDefault = true;
  }
  saveVehicles(vehicles);
  return vehicles;
}

// Trips
export function getTrips(): Trip[] {
  return getItem<Trip[]>(STORAGE_KEYS.TRIPS, []);
}

export function saveTrips(trips: Trip[]): void {
  setItem(STORAGE_KEYS.TRIPS, trips);
}

export function addTrip(trip: Trip): Trip[] {
  const trips = getTrips();
  trips.unshift(trip); // Add to beginning for most recent first
  saveTrips(trips);
  return trips;
}

export function updateTrip(trip: Trip): Trip[] {
  const trips = getTrips();
  const index = trips.findIndex((t) => t.id === trip.id);
  if (index !== -1) {
    trips[index] = { ...trip, updatedAt: Date.now() };
    saveTrips(trips);
  }
  return trips;
}

export function deleteTrip(id: string): Trip[] {
  const trips = getTrips().filter((t) => t.id !== id);
  saveTrips(trips);
  return trips;
}

// Active Trip (for crash recovery)
export function getActiveTrip(): Trip | null {
  return getItem<Trip | null>(STORAGE_KEYS.ACTIVE_TRIP, null);
}

export function saveActiveTrip(trip: Trip | null): void {
  setItem(STORAGE_KEYS.ACTIVE_TRIP, trip);
}

// Settings
export function getSettings(): UserSettings {
  return getItem<UserSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: UserSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Full state (for debugging/export)
export function getFullState(): AppState {
  return {
    vehicles: getVehicles(),
    trips: getTrips(),
    activeTrip: getActiveTrip(),
    settings: getSettings(),
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
