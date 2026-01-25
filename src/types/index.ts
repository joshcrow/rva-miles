export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
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
}

export interface UserSettings {
  nextPayDate: string | null;
  payFrequency: "weekly" | "bi-weekly" | "semi-monthly" | "monthly" | null;
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
