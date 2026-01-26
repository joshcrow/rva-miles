# RVA Miles - Data Models

**Generated:** 2026-01-25  
**Storage:** Browser localStorage (local-first)

## Overview

RVA Miles uses a simple, local-first data model with all data stored in browser localStorage. There is no backend database or API. All data structures are defined in TypeScript for type safety.

---

## Core Data Models

### GpsPoint

**Purpose:** Represents a single GPS coordinate with metadata

```typescript
interface GpsPoint {
  lat: number;           // Latitude in decimal degrees
  lng: number;           // Longitude in decimal degrees
  timestamp: number;     // Unix timestamp in milliseconds
  accuracy?: number;     // GPS accuracy in meters (optional)
}
```

**Example:**
```json
{
  "lat": 37.5407,
  "lng": -77.4360,
  "timestamp": 1706220000000,
  "accuracy": 12.5
}
```

**Usage:**
- Start/end locations for trips
- GPS tracking points during active trip
- Stored in `Trip.gpsPoints` array

**Validation:**
- `lat`: -90 to 90
- `lng`: -180 to 180
- `timestamp`: Unix milliseconds
- `accuracy`: Positive number (meters)

---

### Vehicle

**Purpose:** Represents a user's vehicle for mileage tracking

```typescript
interface Vehicle {
  id: string;            // Unique identifier (timestamp-random)
  name: string;          // Display name (e.g., "My Car")
  make: string;          // Vehicle make (e.g., "Subaru")
  model: string;         // Vehicle model (e.g., "Outback")
  year: number;          // Model year (e.g., 2014)
  isDefault: boolean;    // Whether this is the default vehicle
  createdAt: number;     // Creation timestamp
}
```

**Example:**
```json
{
  "id": "1706220000000-abc123def",
  "name": "2014 Subaru Outback",
  "make": "Subaru",
  "model": "Outback",
  "year": 2014,
  "isDefault": true,
  "createdAt": 1706220000000
}
```

**Business Rules:**
- Only one vehicle can be `isDefault: true`
- If first vehicle, automatically set as default
- Cannot delete last vehicle
- If default vehicle deleted, first remaining becomes default

**Storage Key:** `rva-miles-vehicles`

**Default Vehicle:**
```json
{
  "id": "default-vehicle-1",
  "name": "2014 Subaru Outback",
  "make": "Subaru",
  "model": "Outback",
  "year": 2014,
  "isDefault": true,
  "createdAt": <timestamp>
}
```

---

### Trip

**Purpose:** Represents a single mileage tracking trip

```typescript
interface Trip {
  id: string;                    // Unique identifier
  vehicleId: string;             // Reference to Vehicle.id
  startTime: number;             // Trip start timestamp
  endTime: number | null;        // Trip end timestamp (null if in-progress)
  startLocation: GpsPoint;       // Starting GPS location
  endLocation: GpsPoint | null;  // Ending GPS location (null if in-progress)
  gpsPoints: GpsPoint[];         // Array of GPS points recorded during trip
  distanceMiles: number;         // Total distance in miles
  purpose: string;               // Trip purpose/notes (optional)
  status: "in-progress" | "completed";  // Trip status
  isManualEntry: boolean;        // Whether trip was manually entered
  createdAt: number;             // Creation timestamp
  updatedAt: number;             // Last update timestamp
}
```

**Example (Completed Trip):**
```json
{
  "id": "1706220000000-xyz789abc",
  "vehicleId": "default-vehicle-1",
  "startTime": 1706220000000,
  "endTime": 1706221800000,
  "startLocation": {
    "lat": 37.5407,
    "lng": -77.4360,
    "timestamp": 1706220000000,
    "accuracy": 10
  },
  "endLocation": {
    "lat": 37.5500,
    "lng": -77.4500,
    "timestamp": 1706221800000,
    "accuracy": 15
  },
  "gpsPoints": [
    { "lat": 37.5407, "lng": -77.4360, "timestamp": 1706220000000, "accuracy": 10 },
    { "lat": 37.5450, "lng": -77.4400, "timestamp": 1706220300000, "accuracy": 12 },
    { "lat": 37.5500, "lng": -77.4500, "timestamp": 1706221800000, "accuracy": 15 }
  ],
  "distanceMiles": 12.5,
  "purpose": "Client meeting downtown",
  "status": "completed",
  "isManualEntry": false,
  "createdAt": 1706220000000,
  "updatedAt": 1706221800000
}
```

**Example (In-Progress Trip):**
```json
{
  "id": "1706225000000-def456ghi",
  "vehicleId": "default-vehicle-1",
  "startTime": 1706225000000,
  "endTime": null,
  "startLocation": {
    "lat": 37.5407,
    "lng": -77.4360,
    "timestamp": 1706225000000,
    "accuracy": 10
  },
  "endLocation": null,
  "gpsPoints": [
    { "lat": 37.5407, "lng": -77.4360, "timestamp": 1706225000000, "accuracy": 10 },
    { "lat": 37.5420, "lng": -77.4380, "timestamp": 1706225300000, "accuracy": 12 }
  ],
  "distanceMiles": 0.8,
  "purpose": "",
  "status": "in-progress",
  "isManualEntry": false,
  "createdAt": 1706225000000,
  "updatedAt": 1706225300000
}
```

**Business Rules:**
- `status: "in-progress"` → `endTime` and `endLocation` are null
- `status: "completed"` → `endTime` and `endLocation` are required
- `distanceMiles` calculated using Haversine formula
- GPS points recorded every 3 seconds during tracking
- Manual entries have `isManualEntry: true` and empty `gpsPoints` array

**Storage Keys:**
- `rva-miles-trips` - Array of all trips
- `rva-miles-active-trip` - Single active trip (for crash recovery)

**Sorting:**
- Trips stored with most recent first (unshift on add)
- Displayed chronologically descending

---

### UserSettings

**Purpose:** Application settings and preferences

```typescript
interface UserSettings {
  nextPayDate: string | null;     // Next pay date (ISO string)
  payFrequency: "weekly" | "bi-weekly" | "semi-monthly" | "monthly" | null;
}
```

**Example:**
```json
{
  "nextPayDate": "2026-02-01",
  "payFrequency": "bi-weekly"
}
```

**Default Values:**
```json
{
  "nextPayDate": null,
  "payFrequency": null
}
```

**Storage Key:** `rva-miles-settings`

**Note:** Settings are currently defined but not actively used in the UI. Prepared for future features.

---

### AppState

**Purpose:** Complete application state (for debugging/export)

```typescript
interface AppState {
  vehicles: Vehicle[];
  trips: Trip[];
  activeTrip: Trip | null;
  settings: UserSettings;
}
```

**Example:**
```json
{
  "vehicles": [
    { "id": "default-vehicle-1", "name": "2014 Subaru Outback", ... }
  ],
  "trips": [
    { "id": "trip-1", "vehicleId": "default-vehicle-1", ... },
    { "id": "trip-2", "vehicleId": "default-vehicle-1", ... }
  ],
  "activeTrip": null,
  "settings": {
    "nextPayDate": null,
    "payFrequency": null
  }
}
```

**Usage:**
- Debugging
- Full state export
- Data backup

---

## Helper Types

### NewTrip

**Purpose:** Type for creating new trips (omits auto-generated fields)

```typescript
type NewTrip = Omit<Trip, "id" | "createdAt" | "updatedAt">;
```

**Usage:**
```typescript
const newTrip: NewTrip = {
  vehicleId: "default-vehicle-1",
  startTime: Date.now(),
  endTime: null,
  startLocation: currentGpsPoint,
  endLocation: null,
  gpsPoints: [],
  distanceMiles: 0,
  purpose: "",
  status: "in-progress",
  isManualEntry: false
};
```

### NewVehicle

**Purpose:** Type for creating new vehicles (omits auto-generated fields)

```typescript
type NewVehicle = Omit<Vehicle, "id" | "createdAt">;
```

**Usage:**
```typescript
const newVehicle: NewVehicle = {
  name: "My Car",
  make: "Toyota",
  model: "Camry",
  year: 2020,
  isDefault: false
};
```

---

## Data Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   Vehicle   │
│             │
│ - id (PK)   │
│ - name      │
│ - make      │
│ - model     │
│ - year      │
│ - isDefault │
└─────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│    Trip     │
│             │
│ - id (PK)   │
│ - vehicleId │◄─── Foreign Key
│ - startTime │
│ - endTime   │
│ - locations │
│ - gpsPoints │◄─── Array of GpsPoint
│ - distance  │
│ - purpose   │
│ - status    │
└─────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│  GpsPoint   │
│             │
│ - lat       │
│ - lng       │
│ - timestamp │
│ - accuracy  │
└─────────────┘
```

**Relationships:**
- One Vehicle → Many Trips (1:N)
- One Trip → Many GpsPoints (1:N, embedded)
- No cascading deletes (orphaned trips kept if vehicle deleted)

---

## Storage Schema

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `rva-miles-vehicles` | `Vehicle[]` | Array of all vehicles |
| `rva-miles-trips` | `Trip[]` | Array of all trips |
| `rva-miles-active-trip` | `Trip \| null` | Currently active trip (crash recovery) |
| `rva-miles-settings` | `UserSettings` | User preferences |
| `rva-miles-pin-hash` | `string` | Hashed PIN for authentication |
| `rva-miles-pin-verified` | `string` | Timestamp of last PIN verification |

### Storage Format

All data stored as JSON strings:
```typescript
localStorage.setItem(key, JSON.stringify(value));
const value = JSON.parse(localStorage.getItem(key));
```

### Storage Limits

**localStorage Quota:**
- Typical limit: 5-10 MB per origin
- Current usage: ~1-2 KB per trip
- Estimated capacity: 2,500-5,000 trips

**Data Size Estimates:**
- Vehicle: ~200 bytes
- Trip (with 100 GPS points): ~2 KB
- GpsPoint: ~50 bytes

---

## Data Operations

### CRUD Operations

#### Vehicles
```typescript
// Create
addVehicle(vehicle: Vehicle): Vehicle[]

// Read
getVehicles(): Vehicle[]

// Update
updateVehicle(vehicle: Vehicle): Vehicle[]

// Delete
deleteVehicle(id: string): Vehicle[]
```

#### Trips
```typescript
// Create
addTrip(trip: Trip): Trip[]

// Read
getTrips(): Trip[]

// Update
updateTrip(trip: Trip): Trip[]

// Delete
deleteTrip(id: string): Trip[]
```

#### Active Trip (Crash Recovery)
```typescript
// Read/Write
getActiveTrip(): Trip | null
saveActiveTrip(trip: Trip | null): void
```

#### Settings
```typescript
// Read/Write
getSettings(): UserSettings
saveSettings(settings: UserSettings): void
```

### Utility Functions

```typescript
// Generate unique ID
generateId(): string
// Returns: "1706220000000-abc123def"

// Get complete app state
getFullState(): AppState
```

---

## Data Validation

### Input Validation

**Vehicle:**
- `name`: Required, non-empty string
- `make`: Required, non-empty string
- `model`: Required, non-empty string
- `year`: Required, 4-digit number (1900-2100)

**Trip:**
- `vehicleId`: Must reference existing vehicle
- `startTime`: Required, valid timestamp
- `distanceMiles`: Non-negative number
- `status`: Must be "in-progress" or "completed"

**GpsPoint:**
- `lat`: -90 to 90
- `lng`: -180 to 180
- `timestamp`: Valid Unix timestamp
- `accuracy`: Positive number (if provided)

### Data Integrity

**Referential Integrity:**
- Trips reference vehicles by ID
- No automatic cascade on vehicle delete
- Orphaned trips display "Unknown Vehicle"

**Consistency:**
- Only one default vehicle at a time
- Active trip status matches endTime/endLocation state
- GPS points sorted by timestamp

---

## Data Migration

### Version History

**v1.0 (Current)**
- Initial data schema
- No migrations needed yet

### Future Migration Strategy

If schema changes needed:
1. Version field in localStorage
2. Migration functions on app load
3. Backward compatibility for 1 version

---

## Data Export

### CSV Export Format

**Columns:**
```csv
Date, Start Time, End Time, Vehicle, Distance (miles), Purpose, Start Lat, Start Lng, End Lat, End Lng
```

**Example Row:**
```csv
"01/25/2026","09:00:00 AM","09:30:00 AM","2014 Subaru Outback","12.5","Client meeting","37.540700","-77.436000","37.550000","-77.450000"
```

**Export Features:**
- Date range filtering
- All trip data included
- GPS coordinates for verification
- Compatible with Excel/Google Sheets

---

## Data Privacy & Security

### Local-Only Storage
- All data stored in browser localStorage
- No cloud sync or backup
- No analytics or tracking
- User owns all data

### PIN Protection
- Simple hash-based PIN (not cryptographically secure)
- Acceptable for local device protection
- 7-day session timeout
- Reset requires clearing all data

### Data Deletion
- **Clear Trips:** Deletes all trips, keeps vehicles and PIN
- **Reset Everything:** Clears all localStorage data
- No recovery after deletion

---

## Performance Considerations

### GPS Point Optimization

**Recording Strategy:**
- Record every 3 seconds during tracking
- Filter points with accuracy > 50 meters
- Remove points < 10 meters apart
- Reduces storage and calculation overhead

**Distance Calculation:**
- Haversine formula for accuracy
- Calculated on-demand, not stored per point
- Cached in Trip.distanceMiles

### Storage Performance

**Read Operations:**
- Fast (synchronous localStorage access)
- Entire arrays loaded into memory
- No pagination needed (small datasets)

**Write Operations:**
- Synchronous localStorage writes
- Entire arrays written on change
- No performance issues with typical usage

---

## Test Data

### Test Data Generation

**Function:** `addTestData(weeks: number)`

**Generated Data:**
- Random trips around Richmond, VA
- Realistic distances (5-50 miles)
- Random times throughout day
- Random purposes
- Uses default vehicle

**Example:**
```typescript
addTestData(4); // Generates 4 weeks of test trips
```

**Data Summary:**
```typescript
getTestDataSummary(): {
  totalTrips: number;
  totalMiles: number;
  dateRange: string;
}
```

---

**Last Updated:** 2026-01-25  
**Schema Version:** 1.0  
**Storage Type:** Browser localStorage
