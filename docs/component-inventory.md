# RVA Miles - Component Inventory

**Generated:** 2026-01-25  
**Total Components:** 15+ components across 4 categories

## Component Categories

1. [Authentication Components](#authentication-components)
2. [Feature Components](#feature-components)
3. [UI Components](#ui-components)
4. [View Components](#view-components)

---

## Authentication Components

### PinGate
**Location:** `src/components/auth/PinGate.tsx`  
**Type:** Wrapper Component  
**Purpose:** PIN-based authentication and session management

**Features:**
- PIN setup on first launch
- PIN verification for returning users
- 7-day session duration
- Simple hash-based PIN storage
- Reset functionality

**Props:**
```typescript
interface PinGateProps {
  children: React.ReactNode;
}
```

**States:**
- Setup mode (first time)
- Verification mode (returning user)
- Verified (show app)

**Usage:**
```tsx
<PinGate>
  <AppContent />
</PinGate>
```

---

## Feature Components

### TripTracker
**Location:** `src/components/trip/TripTracker.tsx`  
**Type:** Feature Component  
**Purpose:** Core GPS tracking functionality

**Features:**
- Start/stop trip tracking
- Real-time distance calculation
- GPS point recording
- Wake lock management
- Platform-specific optimizations (iOS/Android)
- Active trip persistence
- Trip discard functionality

**Props:**
```typescript
interface TripTrackerProps {
  onTripComplete?: (trip: Trip) => void;
}
```

**Custom Hooks Used:**
- `useGeolocation` - GPS tracking
- `useWakeLock` - Screen wake lock (Android)
- `useNoSleep` - Screen wake fallback (iOS)
- `usePlatform` - Platform detection

**Key States:**
- `activeTrip: Trip | null`
- `selectedVehicleId: string`
- `showStopModal: boolean`
- `showIOSChecklist: boolean`
- `elapsedTime: number`

**UI Modes:**
1. Start trip UI (vehicle selection)
2. Active trip UI (tracking display)
3. Stop trip modal (purpose entry)
4. iOS checklist modal (pre-trip)

### TripHistory
**Location:** `src/components/trip/TripHistory.tsx`  
**Type:** Feature Component  
**Purpose:** Display and manage past trips

**Features:**
- List all completed trips
- Sort by date (most recent first)
- Edit trip functionality
- Delete trip functionality
- Display distance and duration
- Show vehicle name
- Empty state handling

**Props:**
```typescript
interface TripHistoryProps {
  refreshKey: number;
  onEditTrip: (trip: Trip) => void;
}
```

**Display Format:**
- Date and time
- Vehicle name
- Distance (miles)
- Duration
- Purpose (if provided)

### ManualTripForm
**Location:** `src/components/trip/ManualTripForm.tsx`  
**Type:** Modal Form Component  
**Purpose:** Add or edit trips manually

**Features:**
- Create new manual trips
- Edit existing trips
- Manual distance entry
- Date/time selection
- Vehicle selection
- Purpose/notes field
- Form validation

**Props:**
```typescript
interface ManualTripFormProps {
  trip?: Trip | null;
  onClose: () => void;
  onSave: () => void;
}
```

**Form Fields:**
- Vehicle (dropdown)
- Date
- Start time
- End time
- Distance (miles)
- Purpose (optional)

### VehicleManager
**Location:** `src/components/vehicle/VehicleManager.tsx`  
**Type:** Feature Component  
**Purpose:** CRUD operations for vehicles

**Features:**
- List all vehicles
- Add new vehicle
- Edit existing vehicle
- Delete vehicle
- Set default vehicle
- Form validation

**Props:**
```typescript
interface VehicleManagerProps {
  onClose: () => void;
}
```

**Form Fields:**
- Name (e.g., "My Car")
- Make (e.g., "Subaru")
- Model (e.g., "Outback")
- Year
- Is Default (checkbox)

---

## UI Components

### Button
**Location:** `src/components/ui/Button.tsx`  
**Type:** Reusable UI Component  
**Purpose:** Styled button with variants

**Variants:**
- `primary` - Blue background (default)
- `secondary` - Gray background
- `danger` - Red background
- `ghost` - Transparent background

**Sizes:**
- `sm` - Small
- `md` - Medium (default)
- `lg` - Large
- `xl` - Extra large

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  children: React.ReactNode;
}
```

**Features:**
- Loading state with spinner
- Disabled state styling
- Full width option via className
- Accessible (proper button semantics)

### Card
**Location:** `src/components/ui/Card.tsx`  
**Type:** Reusable UI Component  
**Purpose:** Container with elevation and padding

**Variants:**
- `default` - Standard card
- `elevated` - Higher elevation shadow

**Props:**
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated";
  className?: string;
}
```

**Styling:**
- Dark background (slate-800)
- Rounded corners
- Border (slate-700)
- Padding (p-6)
- Optional shadow

### Input
**Location:** `src/components/ui/Input.tsx`  
**Type:** Reusable UI Component  
**Purpose:** Text/number input with label

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

**Features:**
- Optional label
- Error message display
- Dark theme styling
- Focus ring (blue)
- Full width by default

**Input Types Supported:**
- text
- number
- date
- time
- password

### Select
**Location:** `src/components/ui/Select.tsx`  
**Type:** Reusable UI Component  
**Purpose:** Dropdown select with label

**Props:**
```typescript
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}
```

**Features:**
- Optional label
- Error message display
- Dark theme styling
- Focus ring (blue)
- Full width by default

---

## View Components

### ExportView
**Location:** `src/app/page.tsx` (inline component)  
**Type:** View Component  
**Purpose:** CSV export functionality

**Features:**
- Date range filtering
- Trip count display
- Total miles calculation
- CSV generation
- File download
- Empty state handling

**CSV Format:**
```csv
Date, Start Time, End Time, Vehicle, Distance (miles), Purpose, Start Lat, Start Lng, End Lat, End Lng
```

**Props:**
```typescript
interface ExportViewProps {
  onBack: () => void;
}
```

### SettingsView
**Location:** `src/app/page.tsx` (inline component)  
**Type:** View Component  
**Purpose:** App settings and data management

**Features:**
- Data summary display
- Test data generation (4 weeks)
- PIN change
- Clear all trips
- Reset everything
- Data privacy notice

**Props:**
```typescript
interface SettingsViewProps {
  onBack: () => void;
  onDataChange: () => void;
}
```

**Sections:**
1. Data Summary
2. Test Data Generation
3. Security (Change PIN)
4. Danger Zone (Clear/Reset)

---

## Custom Hooks

### useGeolocation
**Location:** `src/hooks/useGeolocation.ts`  
**Purpose:** GPS tracking abstraction

**Returns:**
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

**Configuration:**
- `enableHighAccuracy: true`
- `timeout: 10000ms`
- `trackingInterval: 3000ms` (configurable)

### useWakeLock
**Location:** `src/hooks/useWakeLock.ts`  
**Purpose:** Screen wake lock (Android)

**Returns:**
```typescript
interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => void;
}
```

**Browser Support:**
- Android Chrome: ✅
- iOS Safari: ❌
- Desktop Chrome: ✅

### useNoSleep
**Location:** `src/hooks/useNoSleep.ts`  
**Purpose:** Screen wake fallback (iOS)

**Returns:**
```typescript
interface UseNoSleepReturn {
  isEnabled: boolean;
  enable: () => Promise<void>;
  disable: () => void;
}
```

**Implementation:**
- Uses nosleep.js library
- Video-based technique
- Works on iOS Safari

### usePlatform
**Location:** `src/hooks/usePlatform.ts`  
**Purpose:** Platform detection

**Returns:**
```typescript
interface UsePlatformReturn {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isStandalone: boolean;
}
```

**Detection Methods:**
- User agent parsing
- Display mode detection (PWA)
- Mobile vs desktop

---

## Component Relationships

### Dependency Graph

```
page.tsx (AppContent)
├── PinGate
├── TripTracker
│   ├── useGeolocation
│   ├── useWakeLock
│   ├── useNoSleep
│   ├── usePlatform
│   ├── Button
│   ├── Card
│   ├── Input
│   └── Select
├── TripHistory
│   ├── Button
│   └── Card
├── ManualTripForm
│   ├── Button
│   ├── Card
│   ├── Input
│   └── Select
├── VehicleManager
│   ├── Button
│   ├── Card
│   └── Input
├── ExportView
│   ├── Button
│   ├── Card
│   └── Input
└── SettingsView
    ├── Button
    └── Card
```

### Shared Dependencies

**All Feature Components Use:**
- UI components (Button, Card, Input, Select)
- Storage utilities (`src/lib/storage.ts`)
- Type definitions (`src/types/index.ts`)

**Trip Components Use:**
- Geo utilities (`src/lib/geo.ts`)
- Trip and Vehicle types

---

## Component Design Patterns

### Pattern 1: Controlled Components
All form inputs are controlled components with React state.

### Pattern 2: Composition
UI components are composed into feature components.

### Pattern 3: Custom Hooks
Complex logic extracted into reusable hooks.

### Pattern 4: Prop Drilling
State passed down through props (no global state management).

### Pattern 5: Callback Props
Parent components pass callbacks for child actions.

---

## Styling Approach

**TailwindCSS Utility Classes**
- Dark theme (slate colors)
- Responsive design
- Mobile-first approach
- Consistent spacing and sizing

**Color Palette:**
- Background: `bg-slate-900`, `bg-slate-800`
- Text: `text-white`, `text-slate-400`
- Primary: `bg-blue-600`, `text-blue-400`
- Success: `bg-green-600`, `text-green-400`
- Danger: `bg-red-600`, `text-red-400`

---

## Component Testing Considerations

### Testable Components
- UI components (Button, Card, Input, Select)
- Custom hooks (useGeolocation, useWakeLock, etc.)
- Utility functions (geo.ts, storage.ts)

### Integration Testing
- TripTracker flow (start → track → stop)
- VehicleManager CRUD operations
- Export CSV generation

### E2E Testing
- Full trip tracking workflow
- PIN authentication flow
- Data persistence across sessions

---

**Last Updated:** 2026-01-25  
**Component Count:** 15+ components  
**Custom Hooks:** 4  
**Utility Modules:** 3
