# RVA Miles - Source Tree Analysis

**Generated:** 2026-01-25  
**Project Root:** `/Users/joshcrow/miles/rva-miles`

## Directory Structure Overview

```
rva-miles/
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   └── types/                    # TypeScript definitions
├── public/                       # Static assets & PWA
├── docs/                         # Project documentation
├── _bmad/                        # BMad workflow system
├── _bmad-output/                 # Planning artifacts
└── [config files]                # Build & dev configs
```

---

## Detailed Source Tree

### `/src/app/` - Next.js App Router
**Purpose:** Application entry point and routing

```
src/app/
├── favicon.ico                   # App icon
├── globals.css                   # Global styles (TailwindCSS)
├── layout.tsx                    # Root layout (metadata, fonts, PWA config)
└── page.tsx                      # Main application page (AppContent)
```

**Key Files:**

#### `layout.tsx`
- Root layout component
- PWA metadata configuration
- Font loading (Geist Sans, Geist Mono)
- Viewport configuration
- Apple Web App settings

#### `page.tsx`
- Main application logic
- View routing (home, vehicles, export, settings)
- Contains inline view components:
  - `AppContent` - Main app wrapper
  - `ExportView` - CSV export functionality
  - `SettingsView` - Settings and data management

#### `globals.css`
- TailwindCSS imports
- Custom CSS variables
- Dark theme base styles

---

### `/src/components/` - React Components
**Purpose:** Reusable and feature-specific components

```
src/components/
├── auth/
│   └── PinGate.tsx              # PIN authentication wrapper
├── trip/
│   ├── TripTracker.tsx          # GPS tracking component
│   ├── TripHistory.tsx          # Trip list display
│   └── ManualTripForm.tsx       # Manual trip entry form
├── ui/
│   ├── Button.tsx               # Reusable button component
│   ├── Card.tsx                 # Container component
│   ├── Input.tsx                # Text/number input
│   └── Select.tsx               # Dropdown select
└── vehicle/
    └── VehicleManager.tsx       # Vehicle CRUD operations
```

**Component Categories:**

#### Authentication (`auth/`)
- **PinGate.tsx** (217 lines)
  - PIN setup and verification
  - Session management (7-day duration)
  - Hash-based PIN storage
  - Reset functionality

#### Trip Management (`trip/`)
- **TripTracker.tsx** (522 lines)
  - Core GPS tracking logic
  - Real-time distance calculation
  - Wake lock management
  - Platform-specific UI (iOS/Android)
  - Active trip persistence
  
- **TripHistory.tsx**
  - Display completed trips
  - Edit/delete operations
  - Sort by date
  
- **ManualTripForm.tsx**
  - Manual trip entry
  - Edit existing trips
  - Form validation

#### UI Components (`ui/`)
- **Button.tsx** - Variants: primary, secondary, danger, ghost
- **Card.tsx** - Container with elevation
- **Input.tsx** - Labeled text/number inputs
- **Select.tsx** - Dropdown with options

#### Vehicle Management (`vehicle/`)
- **VehicleManager.tsx**
  - Add/edit/delete vehicles
  - Default vehicle selection
  - Vehicle metadata (make, model, year)

---

### `/src/hooks/` - Custom React Hooks
**Purpose:** Reusable stateful logic

```
src/hooks/
├── useGeolocation.ts            # GPS tracking abstraction (181 lines)
├── useWakeLock.ts               # Screen wake lock (Android) (2143 bytes)
├── useNoSleep.ts                # Screen wake fallback (iOS) (1429 bytes)
└── usePlatform.ts               # Platform detection (1301 bytes)
```

**Hook Descriptions:**

#### `useGeolocation.ts`
- Wraps Geolocation API
- Automatic point recording at intervals
- Error handling for permissions
- Start/stop/clear tracking
- Returns: `currentPosition`, `gpsPoints`, `isTracking`, `error`, etc.

#### `useWakeLock.ts`
- Uses Wake Lock API (Android Chrome)
- Prevents screen sleep during tracking
- Automatic release on visibility change
- Returns: `isSupported`, `isActive`, `request()`, `release()`

#### `useNoSleep.ts`
- Fallback for iOS using nosleep.js
- Video-based screen wake technique
- Returns: `isEnabled`, `enable()`, `disable()`

#### `usePlatform.ts`
- Platform detection (iOS, Android, mobile, standalone)
- User agent parsing
- PWA display mode detection
- Returns: `isIOS`, `isAndroid`, `isMobile`, `isStandalone`

---

### `/src/lib/` - Utility Libraries
**Purpose:** Pure functions and utilities

```
src/lib/
├── geo.ts                       # GPS calculations (104 lines)
├── storage.ts                   # localStorage abstraction (165 lines)
└── testData.ts                  # Test data generation (6557 bytes)
```

**Library Descriptions:**

#### `geo.ts`
- **Haversine distance calculation** - Distance between two GPS points
- **Total distance calculation** - Sum distances for array of points
- **GPS point filtering** - Remove inaccurate/redundant points
- **Formatting utilities** - `formatDistance()`, `formatDuration()`

Key Functions:
```typescript
haversineDistance(point1, point2): number
calculateTotalDistance(points): number
filterGpsPoints(points, minDistance, maxAccuracy): GpsPoint[]
formatDistance(miles): string
formatDuration(startTime, endTime): string
```

#### `storage.ts`
- **localStorage abstraction** - Type-safe storage operations
- **CRUD operations** - Vehicles, trips, settings
- **Default data** - Default vehicle (2014 Subaru Outback)
- **Active trip persistence** - For crash recovery

Key Functions:
```typescript
// Vehicles
getVehicles(), saveVehicles(), addVehicle(), updateVehicle(), deleteVehicle()

// Trips
getTrips(), saveTrips(), addTrip(), updateTrip(), deleteTrip()

// Active Trip (crash recovery)
getActiveTrip(), saveActiveTrip()

// Settings
getSettings(), saveSettings()

// Utilities
generateId(): string
getFullState(): AppState
```

Storage Keys:
- `rva-miles-vehicles`
- `rva-miles-trips`
- `rva-miles-active-trip`
- `rva-miles-settings`
- `rva-miles-pin-hash`
- `rva-miles-pin-verified`

#### `testData.ts`
- Generate realistic test trips around Richmond, VA
- Random locations, distances, and times
- 4 weeks of sample data
- Data summary utilities

---

### `/src/types/` - TypeScript Definitions
**Purpose:** Type safety and interfaces

```
src/types/
├── index.ts                     # Core type definitions (51 lines)
└── next-pwa.d.ts               # PWA type declarations (571 bytes)
```

**Type Definitions:**

#### `index.ts`
Core interfaces:
```typescript
interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  isDefault: boolean;
  createdAt: number;
}

interface Trip {
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

interface UserSettings {
  nextPayDate: string | null;
  payFrequency: "weekly" | "bi-weekly" | "semi-monthly" | "monthly" | null;
}

interface AppState {
  vehicles: Vehicle[];
  trips: Trip[];
  activeTrip: Trip | null;
  settings: UserSettings;
}

// Helper types
type NewTrip = Omit<Trip, "id" | "createdAt" | "updatedAt">;
type NewVehicle = Omit<Vehicle, "id" | "createdAt">;
```

#### `next-pwa.d.ts`
- Type declarations for next-pwa module
- Service worker types

---

### `/public/` - Static Assets
**Purpose:** Public files and PWA assets

```
public/
├── icons/
│   ├── icon-192x192.png         # PWA icon (192x192)
│   └── icon-512x512.png         # PWA icon (512x512)
├── manifest.json                # PWA manifest
├── file.svg                     # Next.js default icon
├── globe.svg                    # Next.js default icon
├── next.svg                     # Next.js logo
└── vercel.svg                   # Vercel logo
```

**Key Files:**

#### `manifest.json`
PWA configuration:
```json
{
  "name": "RVA Miles - Work Mileage Tracker",
  "short_name": "RVA Miles",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [...]
}
```

---

### `/docs/` - Project Documentation
**Purpose:** Generated project documentation

```
docs/
├── project-scan-report.json     # Workflow state file
├── project-overview.md          # High-level project summary
├── architecture.md              # Architecture documentation
├── component-inventory.md       # Component catalog
├── source-tree-analysis.md      # This file
├── data-models.md               # Data structure documentation
├── development-guide.md         # Setup and development
└── index.md                     # Master documentation index
```

---

## Configuration Files

### Root Level Config Files

```
rva-miles/
├── package.json                 # Dependencies and scripts
├── package-lock.json            # Locked dependency versions
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js & PWA configuration
├── postcss.config.mjs           # PostCSS configuration
├── eslint.config.mjs            # ESLint configuration
├── .gitignore                   # Git ignore patterns
├── .mcp.json                    # MCP configuration
├── README.md                    # Project README
└── next-env.d.ts               # Next.js type declarations
```

**Key Configuration Files:**

#### `package.json`
```json
{
  "name": "rva-miles",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.1.4",
    "next-pwa": "^5.6.0",
    "nosleep.js": "^0.12.0",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "typescript": "^5",
    ...
  }
}
```

#### `tsconfig.json`
- Target: ES2017
- Module: ESNext
- Strict mode enabled
- Path alias: `@/*` → `./src/*`

#### `next.config.ts`
- PWA configuration (next-pwa)
- Service worker settings
- Disabled in development

---

## Critical Directories

### Entry Points
1. **`src/app/page.tsx`** - Main application entry
2. **`src/app/layout.tsx`** - Root layout and metadata
3. **`public/manifest.json`** - PWA configuration

### Core Logic
1. **`src/components/trip/TripTracker.tsx`** - GPS tracking
2. **`src/hooks/useGeolocation.ts`** - Geolocation abstraction
3. **`src/lib/geo.ts`** - Distance calculations
4. **`src/lib/storage.ts`** - Data persistence

### UI Layer
1. **`src/components/ui/`** - Reusable components
2. **`src/app/globals.css`** - Global styles

### Type Safety
1. **`src/types/index.ts`** - Core type definitions

---

## File Size Analysis

### Largest Files
1. `TripTracker.tsx` - 522 lines (core feature)
2. `page.tsx` - 542 lines (main app + views)
3. `PinGate.tsx` - 217 lines (authentication)
4. `useGeolocation.ts` - 181 lines (GPS hook)
5. `storage.ts` - 165 lines (data layer)

### Total Source Lines
- **Components:** ~1,500+ lines
- **Hooks:** ~400+ lines
- **Utilities:** ~400+ lines
- **Types:** ~100+ lines
- **Total:** ~2,400+ lines of TypeScript/TSX

---

## Import Patterns

### Common Imports

**React & Next.js:**
```typescript
import { useState, useEffect, useCallback } from "react";
import type { Metadata, Viewport } from "next";
```

**Type Imports:**
```typescript
import { Trip, Vehicle, GpsPoint } from "@/types";
```

**Component Imports:**
```typescript
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
```

**Hook Imports:**
```typescript
import { useGeolocation } from "@/hooks/useGeolocation";
import { useWakeLock } from "@/hooks/useWakeLock";
```

**Utility Imports:**
```typescript
import { getVehicles, saveTrips } from "@/lib/storage";
import { calculateTotalDistance, formatDistance } from "@/lib/geo";
```

---

## Build Output

### `.next/` Directory
**Purpose:** Next.js build output (gitignored)

```
.next/
├── cache/                       # Build cache
├── server/                      # Server-side code
├── static/                      # Static assets
└── types/                       # Generated types
```

### `node_modules/`
**Purpose:** Installed dependencies (gitignored)
- ~360MB of dependencies
- Managed by npm

---

## Excluded Directories

### Development Tools
- `.git/` - Git repository
- `.next/` - Build output
- `node_modules/` - Dependencies
- `.windsurf/` - Windsurf workflows
- `_bmad/` - BMad workflow system
- `_bmad-output/` - Planning artifacts

---

## Code Organization Principles

### 1. Separation of Concerns
- **Components:** UI and user interactions
- **Hooks:** Reusable stateful logic
- **Lib:** Pure utility functions
- **Types:** Type definitions

### 2. Feature-Based Structure
- Components grouped by feature (auth, trip, vehicle, ui)
- Related files colocated

### 3. Flat Hierarchy
- Maximum 2-3 levels of nesting
- Easy to navigate and find files

### 4. Clear Naming
- Descriptive file names
- PascalCase for components
- camelCase for utilities and hooks

### 5. Type Safety
- All files use TypeScript
- Shared types in `/types`
- Strict mode enabled

---

## Integration Points

### Browser APIs
- **Geolocation API** - Used in `useGeolocation.ts`
- **localStorage API** - Used in `storage.ts`
- **Wake Lock API** - Used in `useWakeLock.ts`
- **Service Worker API** - Configured in `next.config.ts`

### External Libraries
- **next-pwa** - PWA functionality
- **nosleep.js** - Screen wake fallback
- **TailwindCSS** - Styling

### No Backend Integration
- All data stored locally
- No API calls
- No authentication server

---

## Development Workflow

### File Watching
- Next.js dev server watches `src/` directory
- Hot module replacement (HMR) enabled
- Fast refresh for React components

### Build Process
1. TypeScript compilation
2. Next.js optimization
3. Service worker generation (PWA)
4. Static asset copying

---

**Last Updated:** 2026-01-25  
**Total Files:** 30+ source files  
**Total Lines:** ~2,400+ lines of code
