export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

export interface LatLngBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  isDefault: boolean;
  createdAt: number;
}

export interface Trip {
  id: string;
  vehicleId: string;
  startTime: number;
  endTime: number | null;
  startLocation: GpsPoint;
  endLocation: GpsPoint | null;
  gpsPoints: GpsPoint[];
  distanceMiles: number;
  purpose: string;
  status: "in-progress" | "completed";
  isManualEntry: boolean;
  createdAt: number;
  updatedAt: number;
  routePolyline?: string;
  routeBounds?: LatLngBounds;
  category?: string;
  startAddress?: string;
  endAddress?: string;
  estimatedRoute?: boolean;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  location: GpsPoint;
  category?: string;
  createdAt: number;
}

export interface TripTemplate {
  id: string;
  name: string;
  startPlaceId?: string;
  endPlaceId?: string;
  category?: string;
  vehicleId?: string;
  createdAt: number;
}

export interface TripCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface ApiUsageMonth {
  month: string;
  calls: number;
}

export interface UserSettings {
  nextPayDate: string | null;
  payFrequency: "weekly" | "bi-weekly" | "semi-monthly" | "monthly" | null;
  irsRate: number;
  defaultCategory?: string;
  showDollarAmounts: boolean;
  theme?: "dark" | "light";
  apiUsageMonth?: ApiUsageMonth;
  lastExportDate?: number;
}

export interface AppState {
  vehicles: Vehicle[];
  trips: Trip[];
  activeTrip: Trip | null;
  settings: UserSettings;
}

// Helper type for creating new trips
export type NewTrip = Omit<Trip, "id" | "createdAt" | "updatedAt">;

// Helper type for creating new vehicles
export type NewVehicle = Omit<Vehicle, "id" | "createdAt">;
