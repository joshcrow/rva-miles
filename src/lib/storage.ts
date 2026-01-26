import { Vehicle, Trip, UserSettings, AppState, SavedPlace, TripTemplate, TripCategory, GpsPoint } from "@/types";

const STORAGE_KEYS = {
  VEHICLES: "rva-miles-vehicles",
  TRIPS: "rva-miles-trips",
  ACTIVE_TRIP: "rva-miles-active-trip",
  SETTINGS: "rva-miles-settings",
  SAVED_PLACES: "rva-miles-saved-places",
  TRIP_TEMPLATES: "rva-miles-trip-templates",
  TRIP_CATEGORIES: "rva-miles-trip-categories",
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
  irsRate: 0.67,
  showDollarAmounts: true,
  theme: "dark",
  apiUsageMonth: { month: new Date().toISOString().slice(0, 7), calls: 0 },
};

const DEFAULT_CATEGORIES: TripCategory[] = [
  { id: "cat-1", name: "Client Visits", color: "#3b82f6", createdAt: Date.now() },
  { id: "cat-2", name: "Office Supplies", color: "#10b981", createdAt: Date.now() },
  { id: "cat-3", name: "Team Meetings", color: "#f59e0b", createdAt: Date.now() },
];

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

// Validation functions
export function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

export function validateTrip(trip: Trip): boolean {
  if (trip.distanceMiles <= 0) return false;
  if (trip.startTime <= 0 || (trip.endTime && trip.endTime <= trip.startTime)) return false;
  if (!validateCoordinates(trip.startLocation.lat, trip.startLocation.lng)) return false;
  if (trip.endLocation && !validateCoordinates(trip.endLocation.lat, trip.endLocation.lng)) return false;
  return true;
}

export function validateSavedPlace(place: SavedPlace): boolean {
  if (!place.name || !place.address) return false;
  if (!validateCoordinates(place.location.lat, place.location.lng)) return false;
  return true;
}

export function validateCategory(category: TripCategory): boolean {
  if (!category.name || category.name.trim() === "") return false;
  if (category.color && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) return false;
  return true;
}

function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function repairCorruptedData(): void {
  try {
    const trips = getTrips();
    const validTrips = trips.filter(validateTrip);
    if (validTrips.length !== trips.length) {
      console.warn(`Repaired ${trips.length - validTrips.length} corrupted trips`);
      saveTrips(validTrips);
    }
  } catch (error) {
    console.error("Error repairing data:", error);
  }
}

// Saved Places
export function getSavedPlaces(): SavedPlace[] {
  return getItem<SavedPlace[]>(STORAGE_KEYS.SAVED_PLACES, []);
}

export function saveSavedPlaces(places: SavedPlace[]): void {
  setItem(STORAGE_KEYS.SAVED_PLACES, places);
}

export function addSavedPlace(place: SavedPlace): SavedPlace[] {
  if (!validateSavedPlace(place)) {
    throw new Error("Invalid saved place data");
  }
  const places = getSavedPlaces();
  place.name = sanitizeString(place.name);
  place.address = sanitizeString(place.address);
  places.push(place);
  saveSavedPlaces(places);
  return places;
}

export function updateSavedPlace(place: SavedPlace): SavedPlace[] {
  if (!validateSavedPlace(place)) {
    throw new Error("Invalid saved place data");
  }
  const places = getSavedPlaces();
  const index = places.findIndex((p) => p.id === place.id);
  if (index !== -1) {
    place.name = sanitizeString(place.name);
    place.address = sanitizeString(place.address);
    places[index] = place;
    saveSavedPlaces(places);
  }
  return places;
}

export function deleteSavedPlace(id: string): SavedPlace[] {
  const places = getSavedPlaces().filter((p) => p.id !== id);
  saveSavedPlaces(places);
  
  // Remove references from templates
  const templates = getTripTemplates();
  const updatedTemplates = templates.map((t) => ({
    ...t,
    startPlaceId: t.startPlaceId === id ? undefined : t.startPlaceId,
    endPlaceId: t.endPlaceId === id ? undefined : t.endPlaceId,
  }));
  saveTripTemplates(updatedTemplates);
  
  return places;
}

// Trip Templates
export function getTripTemplates(): TripTemplate[] {
  return getItem<TripTemplate[]>(STORAGE_KEYS.TRIP_TEMPLATES, []);
}

export function saveTripTemplates(templates: TripTemplate[]): void {
  setItem(STORAGE_KEYS.TRIP_TEMPLATES, templates);
}

export function addTripTemplate(template: TripTemplate): TripTemplate[] {
  const templates = getTripTemplates();
  template.name = sanitizeString(template.name);
  templates.push(template);
  saveTripTemplates(templates);
  return templates;
}

export function updateTripTemplate(template: TripTemplate): TripTemplate[] {
  const templates = getTripTemplates();
  const index = templates.findIndex((t) => t.id === template.id);
  if (index !== -1) {
    template.name = sanitizeString(template.name);
    templates[index] = template;
    saveTripTemplates(templates);
  }
  return templates;
}

export function deleteTripTemplate(id: string): TripTemplate[] {
  const templates = getTripTemplates().filter((t) => t.id !== id);
  saveTripTemplates(templates);
  return templates;
}

// Trip Categories
export function getTripCategories(): TripCategory[] {
  const categories = getItem<TripCategory[]>(STORAGE_KEYS.TRIP_CATEGORIES, []);
  if (categories.length === 0) {
    saveTripCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return categories;
}

export function saveTripCategories(categories: TripCategory[]): void {
  setItem(STORAGE_KEYS.TRIP_CATEGORIES, categories);
}

export function addTripCategory(category: TripCategory): TripCategory[] {
  if (!validateCategory(category)) {
    throw new Error("Invalid category data");
  }
  const categories = getTripCategories();
  category.name = sanitizeString(category.name);
  categories.push(category);
  saveTripCategories(categories);
  return categories;
}

export function updateTripCategory(category: TripCategory): TripCategory[] {
  if (!validateCategory(category)) {
    throw new Error("Invalid category data");
  }
  const categories = getTripCategories();
  const index = categories.findIndex((c) => c.id === category.id);
  if (index !== -1) {
    category.name = sanitizeString(category.name);
    categories[index] = category;
    saveTripCategories(categories);
  }
  return categories;
}

export function deleteTripCategory(id: string): TripCategory[] {
  const categories = getTripCategories().filter((c) => c.id !== id);
  saveTripCategories(categories);
  return categories;
}

// Storage size monitoring
export function getStorageSize(): number {
  let size = 0;
  for (const key in localStorage) {
    if (key.startsWith("rva-miles-")) {
      const value = localStorage.getItem(key);
      if (value) {
        size += new Blob([value]).size;
      }
    }
  }
  return size;
}

export function getStorageSizeMB(): number {
  return getStorageSize() / (1024 * 1024);
}

export function checkStorageLimit(): { size: number; percentage: number; warning: boolean } {
  const size = getStorageSizeMB();
  const percentage = (size / 5) * 100;
  return {
    size,
    percentage,
    warning: size >= 4,
  };
}
