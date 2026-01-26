# RVA Miles - Architecture Documentation

**Generated:** 2026-01-25  
**Version:** 1.0  
**Architecture Type:** Client-Side Progressive Web Application

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Pattern](#architecture-pattern)
4. [Component Architecture](#component-architecture)
5. [Data Architecture](#data-architecture)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Security Architecture](#security-architecture)
9. [Performance Considerations](#performance-considerations)
10. [Deployment Architecture](#deployment-architecture)

## Executive Summary

RVA Miles is a Progressive Web App built with Next.js 16 and React 19, designed as a local-first application with no backend dependencies. The architecture prioritizes offline functionality, GPS accuracy, and platform-specific optimizations for iOS and Android devices.

**Key Architectural Decisions:**
- **Local-First:** All data stored in browser localStorage
- **Client-Side Only:** No backend server or API calls
- **PWA-Enabled:** Installable with offline capabilities
- **Platform-Aware:** Conditional logic for iOS/Android/Desktop
- **Type-Safe:** Full TypeScript implementation

## Technology Stack

### Core Framework
```typescript
{
  "framework": "Next.js 16.1.4",
  "runtime": "React 19.2.3",
  "language": "TypeScript 5.x",
  "buildTool": "Next.js Compiler (Webpack)",
  "rendering": "Client-Side (CSR)"
}
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.4 | React framework with App Router |
| react | 19.2.3 | UI library |
| react-dom | 19.2.3 | React DOM renderer |
| next-pwa | 5.6.0 | PWA capabilities & service worker |
| nosleep.js | 0.12.0 | Prevent screen sleep during tracking |
| tailwindcss | 4.x | Utility-first CSS framework |
| typescript | 5.x | Type safety |

### Browser APIs Used
- **Geolocation API:** GPS tracking
- **localStorage API:** Data persistence
- **Wake Lock API:** Screen wake lock (Android)
- **Service Worker API:** PWA offline support

## Architecture Pattern

### Component-Based Architecture

```
┌─────────────────────────────────────────┐
│         Next.js App Router              │
│         (File-based Routing)            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Root Layout                    │
│     (Global Styles, Fonts, PWA)         │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           PinGate (Auth)                │
│      (Session Management)               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          AppContent (Main)              │
│    (View Router & State Manager)        │
└─────────────────────────────────────────┘
         │         │         │         │
         ▼         ▼         ▼         ▼
    ┌────────┬─────────┬────────┬──────────┐
    │ Home   │Vehicles │ Export │ Settings │
    │ View   │  View   │  View  │   View   │
    └────────┴─────────┴────────┴──────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Feature Components                 │
│  - TripTracker                          │
│  - TripHistory                          │
│  - VehicleManager                       │
│  - ManualTripForm                       │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       UI Components                     │
│  - Button, Card, Input, Select          │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    Custom Hooks & Utilities            │
│  - useGeolocation                       │
│  - useWakeLock                          │
│  - useNoSleep                           │
│  - usePlatform                          │
│  - storage.ts, geo.ts                   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Browser APIs & Storage             │
│  - Geolocation API                      │
│  - localStorage                         │
│  - Wake Lock API                        │
└─────────────────────────────────────────┘
```

### Rendering Strategy

**Client-Side Rendering (CSR)**
- All components use `"use client"` directive
- No server-side rendering or static generation
- Rationale: GPS APIs and localStorage only available in browser

### Routing Architecture

**Next.js App Router (File-Based)**
```
src/app/
├── layout.tsx          # Root layout (metadata, fonts, PWA config)
├── page.tsx            # Main application page
└── globals.css         # Global styles
```

**Client-Side View Routing**
- Views managed by state: `"home" | "vehicles" | "export" | "settings"`
- No URL-based routing (single-page experience)
- Navigation via bottom tab bar

## Component Architecture

### Component Hierarchy

```
Home (page.tsx)
├── PinGate (Auth Wrapper)
│   └── AppContent (Main App)
│       ├── Header (Navigation)
│       ├── HomeView
│       │   ├── TripTracker
│       │   │   ├── Platform Detection (usePlatform)
│       │   │   ├── GPS Tracking (useGeolocation)
│       │   │   ├── Wake Lock (useWakeLock, useNoSleep)
│       │   │   └── UI Components (Button, Card, Input, Select)
│       │   └── TripHistory
│       │       └── Trip Cards
│       ├── VehiclesView
│       │   └── VehicleManager
│       ├── ExportView
│       │   └── CSV Export Logic
│       └── SettingsView
│           └── Settings & Data Management
└── ManualTripForm (Modal)
```

### Component Categories

#### 1. Authentication Components
- **PinGate:** PIN setup and verification
  - Session management (7-day duration)
  - Simple hash-based PIN storage
  - Setup vs. entry screens

#### 2. Feature Components
- **TripTracker:** Core GPS tracking functionality
  - Real-time distance calculation
  - Platform-specific optimizations
  - Wake lock management
  - Trip state persistence
  
- **TripHistory:** Display past trips
  - Sorted by date (most recent first)
  - Edit/delete capabilities
  - Distance and duration display

- **VehicleManager:** CRUD for vehicles
  - Default vehicle selection
  - Vehicle metadata (make, model, year)

- **ManualTripForm:** Manual trip entry
  - Edit existing trips
  - Manual distance entry
  - Purpose/notes field

#### 3. UI Components (Reusable)
- **Button:** Variants (primary, secondary, danger, ghost)
- **Card:** Container with elevation
- **Input:** Text/number inputs with labels
- **Select:** Dropdown with options

#### 4. View Components
- **ExportView:** CSV generation and download
- **SettingsView:** App settings and data management

### Custom Hooks

#### useGeolocation
```typescript
interface UseGeolocationReturn {
  currentPosition: GpsPoint | null;
  gpsPoints: GpsPoint[];
  isTracking: boolean;
  error: string | null;
  isSupported: boolean;
  startTracking: () => void;
  stopTracking: () => GpsPoint[];
  clearPoints: () => void;
}
```
- Wraps Geolocation API
- Automatic point recording at intervals
- Error handling for permissions

#### useWakeLock
```typescript
interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => void;
}
```
- Uses Wake Lock API (Android Chrome)
- Prevents screen sleep during tracking

#### useNoSleep
```typescript
interface UseNoSleepReturn {
  isEnabled: boolean;
  enable: () => Promise<void>;
  disable: () => void;
}
```
- Fallback for iOS using nosleep.js
- Video-based screen wake technique

#### usePlatform
```typescript
interface UsePlatformReturn {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isStandalone: boolean;
}
```
- Platform detection for conditional UI
- PWA standalone mode detection

## Data Architecture

### Data Models

#### Core Types
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
```

### Storage Layer

**localStorage Schema**
```typescript
const STORAGE_KEYS = {
  VEHICLES: "rva-miles-vehicles",
  TRIPS: "rva-miles-trips",
  ACTIVE_TRIP: "rva-miles-active-trip",
  SETTINGS: "rva-miles-settings",
  PIN_HASH: "rva-miles-pin-hash",
  PIN_VERIFIED: "rva-miles-pin-verified"
}
```

**Storage Operations**
- `getVehicles()`, `saveVehicles()`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()`
- `getTrips()`, `saveTrips()`, `addTrip()`, `updateTrip()`, `deleteTrip()`
- `getActiveTrip()`, `saveActiveTrip()` - For crash recovery
- `getSettings()`, `saveSettings()`

**Data Persistence Strategy**
- All data stored as JSON in localStorage
- No backend synchronization
- Active trip saved periodically during tracking
- Default vehicle (2014 Subaru Outback) created on first launch

### Distance Calculation

**Haversine Formula Implementation**
```typescript
function haversineDistance(point1: GpsPoint, point2: GpsPoint): number {
  // Earth radius in miles
  const EARTH_RADIUS_MILES = 3958.8;
  
  // Convert to radians and calculate
  // Returns distance in miles
}
```

**GPS Point Filtering**
- Filters points with accuracy > 50 meters
- Removes points < 10 meters apart
- Reduces GPS drift and noise

## State Management

### Strategy: Local Component State

**No Global State Management Library**
- Uses React hooks: `useState`, `useEffect`, `useCallback`
- State lifted to parent components when needed
- Props drilling for shared state

### State Flow

```
AppContent (View State)
    │
    ├─→ currentView: "home" | "vehicles" | "export" | "settings"
    ├─→ refreshKey: number (trigger re-renders)
    └─→ showManualForm: boolean
         │
         ▼
TripTracker (Trip State)
    │
    ├─→ activeTrip: Trip | null
    ├─→ selectedVehicleId: string
    ├─→ elapsedTime: number
    └─→ gpsPoints: GpsPoint[] (from useGeolocation)
```

### State Persistence

**Active Trip Recovery**
- Active trip saved to localStorage every GPS update
- On app reload, check for `rva-miles-active-trip`
- Resume tracking if found

**Session Management**
- PIN verification stored with timestamp
- 7-day session duration
- Cleared on logout or expiration

## API Integration

### Browser APIs

#### Geolocation API
```typescript
navigator.geolocation.watchPosition(
  successCallback,
  errorCallback,
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
)
```

**Configuration:**
- High accuracy mode enabled
- 10-second timeout
- No cached positions
- Recording interval: 3 seconds (configurable)

#### Wake Lock API (Android)
```typescript
navigator.wakeLock.request('screen')
```

**Fallback Strategy:**
1. Try Wake Lock API (Android Chrome, some desktop)
2. Fall back to nosleep.js (iOS, older browsers)
3. Show warning if neither works (iOS Safari)

#### localStorage API
```typescript
localStorage.setItem(key, JSON.stringify(value))
localStorage.getItem(key)
```

**Error Handling:**
- Try-catch for quota exceeded
- Graceful degradation if unavailable

### No External APIs
- No backend server
- No third-party API calls
- Fully offline-capable

## Security Architecture

### PIN Authentication

**Implementation:**
```typescript
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
```

**Security Considerations:**
- Simple hash (not cryptographically secure)
- Acceptable for local device protection
- No network transmission
- 7-day session timeout

### Data Privacy

**Local-Only Storage**
- All data stored in browser localStorage
- No cloud backup or sync
- No analytics or tracking
- User owns all data

**Data Export**
- CSV export includes GPS coordinates
- User controls data export
- No automatic sharing

### Threat Model

**In Scope:**
- Unauthorized local access (mitigated by PIN)
- Data loss (user responsibility to export)

**Out of Scope:**
- Network attacks (no network communication)
- Server-side vulnerabilities (no server)
- Advanced cryptography (not needed for use case)

## Performance Considerations

### GPS Tracking Optimization

**Point Recording Strategy**
- Record every 3 seconds (configurable)
- Filter points with poor accuracy (>50m)
- Remove points too close together (<10m)
- Reduces storage and calculation overhead

### Rendering Optimization

**React Optimization Techniques**
- `useCallback` for event handlers
- `useMemo` for expensive calculations (distance)
- Conditional rendering for platform-specific UI
- Key-based list rendering

### Storage Optimization

**Data Size Management**
- GPS points stored as minimal objects
- Timestamps as numbers (not ISO strings)
- No redundant data
- Periodic cleanup via settings

### Battery Optimization

**Power Management**
- High accuracy GPS (necessary for mileage)
- Wake lock only during active tracking
- Released immediately on trip stop
- iOS checklist educates users

## Deployment Architecture

### Build Configuration

**next.config.ts**
```typescript
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});
```

**PWA Features:**
- Service worker registration
- Offline page caching
- Installable on home screen
- Standalone display mode

### Static Export

**Deployment Strategy**
```bash
npm run build    # Creates optimized production build
npm run start    # Serves production build
```

**Output:**
- Static HTML/CSS/JS files
- Service worker for offline support
- Can be hosted on any static host (Vercel, Netlify, GitHub Pages)

### Environment Configuration

**No Environment Variables Needed**
- All configuration hardcoded
- No API keys or secrets
- No backend URLs

### Browser Compatibility

**Minimum Requirements:**
- Modern browser with ES2017 support
- Geolocation API support
- localStorage support
- Service Worker support (for PWA)

**Tested Platforms:**
- iOS Safari (with limitations)
- Android Chrome (full support)
- Desktop Chrome/Firefox/Safari

### Platform-Specific Considerations

#### iOS
- Wake Lock API not supported
- Uses nosleep.js fallback
- Pre-trip checklist for user education
- Requires screen to stay visible

#### Android
- Full Wake Lock API support
- Background tracking possible
- Optimal user experience

#### Desktop
- Full functionality
- Useful for testing
- GPS may be simulated or unavailable

## Future Architecture Considerations

### Potential Enhancements
1. **Backend Sync:** Optional cloud backup
2. **Multi-Device:** Sync across devices
3. **Advanced Analytics:** Trip patterns and insights
4. **Map Integration:** Visual trip routes
5. **Photo Attachments:** Add photos to trips
6. **Categories:** Trip categorization beyond purpose

### Scalability
- Current architecture supports thousands of trips
- localStorage limit: ~5-10MB (sufficient for years of data)
- No server costs or scaling concerns

### Maintainability
- TypeScript ensures type safety
- Component-based architecture is modular
- Custom hooks encapsulate complex logic
- Clear separation of concerns

---

**Last Updated:** 2026-01-25  
**Architecture Version:** 1.0  
**Next Review:** As needed for major features
