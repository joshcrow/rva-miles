// RVA Miles v2 — core domain types.
// Trips are the ledger; Routes are learned "tiles" that make repeat logging one tap.
// All calendar semantics use LOCAL date keys ('YYYY-MM-DD') captured at logging
// time — never derived from UTC ISO strings (v1's systemic timezone bug class).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  /** Short human label, e.g. "Chesterfield Clinic" */
  name?: string;
  /** Display address */
  address?: string;
  latLng?: LatLng;
}

export type TripSource = "tile" | "manual" | "gps" | "import" | "migrated";

export interface Trip {
  id: string; // uuid
  /** LOCAL calendar date of the trip, 'YYYY-MM-DD' */
  dateKey: string;
  /** epoch ms — present for GPS-tracked trips; optional for tile/manual logs */
  startTime?: number;
  endTime?: number;
  from: Place;
  to: Place;
  /** Authoritative billed distance (what exports use) */
  distanceMiles: number;
  /** Raw GPS-measured distance when the drive was live-tracked */
  gpsDistanceMiles?: number;
  roundTrip?: boolean;
  purpose?: string;
  /** Vehicle name snapshot at logging time */
  vehicle?: string;
  /** $/mile snapshot at logging time — exports NEVER recompute from settings */
  ratePerMile: number;
  /** Owning route tile, if logged from / promoted to one */
  routeId?: string;
  /** Encoded, simplified polyline of the GPS track (compact; optional) */
  polyline?: string;
  source: TripSource;
  createdAt: number;
  updatedAt: number;
  /** Soft delete for undo + sync merge; filtered from all views/exports */
  deletedAt?: number;
}

export interface Route {
  id: string; // uuid
  from: Place;
  to: Place;
  /** Locked road distance for one-way; UI doubles for round trip */
  distanceMiles: number;
  defaultPurpose?: string;
  defaultRoundTrip?: boolean;
  timesUsed: number;
  lastUsedAt: number;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  deletedAt?: number;
}

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface PaySchedule {
  frequency: PayFrequency;
  /** dateKey of any known PERIOD START (anchor for weekly/biweekly cycles) */
  anchorKey: string;
}

export interface Settings {
  /** Shown on reports, e.g. "Dana Smith" */
  ownerName?: string;
  vehicle?: string;
  /** Current default $/mile for NEW trips (snapshot copied onto each trip) */
  ratePerMile: number;
  paySchedule?: PaySchedule;
  reportRecipient?: { name?: string; email?: string };
  theme: "system" | "light" | "dark";
  lastBackupAt?: number;
  /** Non-empty => cloud sync opt-in (server must also be configured) */
  syncCode?: string;
  lastSyncAt?: number;
  onboardedAt?: number;
  installCoachDismissedAt?: number;
}

export interface DateRange {
  /** inclusive */
  startKey: string;
  /** inclusive */
  endKey: string;
}

export interface PeriodPreset {
  label: string;
  range: DateRange;
}

/** Full data snapshot: backup files, merge-import, and sync all speak this */
export interface Snapshot {
  schema: 2;
  exportedAt: number;
  trips: Trip[];
  routes: Route[];
  settings?: Settings;
}

export interface MergeResult {
  tripsAdded: number;
  tripsUpdated: number;
  routesAdded: number;
  routesUpdated: number;
  skipped: number;
}

/** Payload embedded (gzip+base64url) in the /r# report link — no server involved */
export interface ReportPayload {
  v: 1;
  title: string;
  ownerName?: string;
  vehicle?: string;
  range: DateRange;
  generatedAt: number;
  trips: Array<{
    dateKey: string;
    from: string;
    to: string;
    miles: number;
    rate: number;
    purpose?: string;
  }>;
}

export type DriveStatus = "idle" | "acquiring" | "recording" | "signal-lost";

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

/** Persisted continuously during a live drive so a reload can resume honestly */
export interface ActiveDrive {
  id: string;
  startedAt: number;
  vehicle?: string;
  /** Accepted (filtered) points — kept small via simplification on persist */
  points: GpsPoint[];
  /** Running accumulated miles over accepted points */
  distanceMiles: number;
  lastFixAt?: number;
}
