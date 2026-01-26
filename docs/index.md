# RVA Miles - Documentation Index

**Generated:** 2026-01-25  
**Project:** Work Mileage Tracker PWA  
**Version:** 1.0

---

## 📋 Project Overview

**RVA Miles** is a Progressive Web App for tracking work-related mileage with GPS accuracy. Built with Next.js 16 and React 19, it provides real-time GPS tracking, vehicle management, and CSV export functionality with offline capabilities.

**Key Features:**
- 📍 Real-time GPS tracking with Haversine distance calculation
- 🚗 Multi-vehicle management
- 📊 CSV export with date filtering
- 🔒 PIN-based security
- 📱 PWA with offline support
- 🎯 Platform-specific optimizations (iOS/Android)

---

## 🏗️ Project Classification

| Attribute | Value |
|-----------|-------|
| **Project Type** | Web Application (Progressive Web App) |
| **Repository Type** | Monolith |
| **Architecture** | Client-Side SPA with PWA |
| **Primary Language** | TypeScript |
| **Framework** | Next.js 16.1.4 |
| **UI Library** | React 19.2.3 |
| **Styling** | TailwindCSS 4.x |
| **Storage** | Browser localStorage (local-first) |

---

## 📚 Quick Reference

### Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.1.4 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Styling | TailwindCSS | 4.x |
| PWA | next-pwa | 5.6.0 |
| Device APIs | nosleep.js | 0.12.0 |

### Entry Points

- **Main App:** `src/app/page.tsx`
- **Root Layout:** `src/app/layout.tsx`
- **PWA Manifest:** `public/manifest.json`

### Core Components

- **TripTracker:** GPS tracking functionality
- **PinGate:** Authentication wrapper
- **VehicleManager:** Vehicle CRUD operations
- **TripHistory:** Trip list and management

---

## 📖 Documentation

### Core Documentation

#### [Project Overview](./project-overview.md)
High-level project summary, purpose, and key features.
- Executive summary
- Technology stack overview
- Key features and capabilities
- Target users
- Quick start guide

#### [Architecture Documentation](./architecture.md)
Detailed technical architecture and design decisions.
- Architecture patterns
- Component hierarchy
- Data flow
- State management
- API integration (Browser APIs)
- Security architecture
- Performance considerations

#### [Component Inventory](./component-inventory.md)
Complete catalog of all React components and hooks.
- Authentication components
- Feature components
- UI components
- Custom hooks
- Component relationships
- Design patterns

#### [Source Tree Analysis](./source-tree-analysis.md)
Detailed breakdown of project structure and file organization.
- Directory structure
- File descriptions
- Import patterns
- Critical directories
- Code organization principles

#### [Data Models](./data-models.md)
Complete data structure documentation.
- Core entities (Vehicle, Trip, GpsPoint)
- Storage schema
- Data relationships
- CRUD operations
- Data validation
- Export formats

#### [Development Guide](./development-guide.md)
Setup instructions and development workflow.
- Prerequisites
- Getting started
- Development workflow
- Available scripts
- Building for production
- Testing strategies
- Debugging tips
- Common tasks

---

## 🚀 Getting Started

### Quick Start (3 Steps)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
open http://localhost:3000
```

### First Launch

1. **Set up PIN** - Create a 4+ character PIN for security
2. **Add Vehicle** - Use default (2014 Subaru Outback) or add your own
3. **Start Tracking** - Begin your first trip!

---

## 🗂️ Project Structure

```
rva-miles/
├── src/
│   ├── app/              # Next.js App Router (entry point)
│   ├── components/       # React components
│   │   ├── auth/        # PIN authentication
│   │   ├── trip/        # Trip tracking & history
│   │   ├── ui/          # Reusable UI components
│   │   └── vehicle/     # Vehicle management
│   ├── hooks/           # Custom React hooks
│   │   ├── useGeolocation.ts
│   │   ├── useWakeLock.ts
│   │   ├── useNoSleep.ts
│   │   └── usePlatform.ts
│   ├── lib/             # Utility libraries
│   │   ├── geo.ts       # GPS calculations
│   │   ├── storage.ts   # localStorage abstraction
│   │   └── testData.ts  # Test data generation
│   └── types/           # TypeScript definitions
├── public/              # Static assets & PWA manifest
└── docs/                # This documentation
```

---

## 🔧 Development

### Available Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Serve production build
npm run lint     # Run ESLint
```

### Key Technologies

**Frontend:**
- Next.js App Router (file-based routing)
- React 19 with hooks
- TypeScript (strict mode)
- TailwindCSS (utility-first)

**Browser APIs:**
- Geolocation API (GPS tracking)
- localStorage API (data persistence)
- Wake Lock API (screen wake - Android)
- Service Worker API (PWA offline)

**No Backend:**
- All data stored locally
- No API calls
- Fully offline-capable

---

## 📊 Data Architecture

### Core Entities

```typescript
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

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}
```

### Storage

**localStorage Keys:**
- `rva-miles-vehicles` - Vehicle list
- `rva-miles-trips` - Trip history
- `rva-miles-active-trip` - Current trip (crash recovery)
- `rva-miles-settings` - User preferences
- `rva-miles-pin-hash` - Hashed PIN
- `rva-miles-pin-verified` - Session timestamp

---

## 🎯 Key Features

### 1. GPS Trip Tracking
- Real-time location tracking
- Haversine distance calculation
- GPS point filtering (accuracy & redundancy)
- Wake lock to prevent screen sleep
- Platform-specific optimizations

### 2. Vehicle Management
- Multiple vehicle support
- Default vehicle selection
- CRUD operations
- Vehicle metadata (make, model, year)

### 3. Trip Management
- Start/stop tracking
- Manual trip entry
- Edit existing trips
- Trip history with sorting
- Purpose/notes for each trip

### 4. Data Export
- CSV export with date filtering
- All trip details included
- GPS coordinates for verification
- Excel/Google Sheets compatible

### 5. Security
- PIN-based authentication
- 7-day session duration
- Local-only data storage
- No cloud sync or tracking

### 6. PWA Features
- Installable on home screen
- Offline functionality
- Standalone display mode
- Service worker caching

---

## 🧪 Testing

### Manual Testing

**Local Testing:**
```bash
npm run dev
# Open http://localhost:3000
```

**Mobile Testing:**
```bash
# Find your IP
ifconfig | grep "inet "

# Open on mobile device
# http://192.168.1.x:3000
```

**PWA Testing:**
```bash
npm run build
npm run start
# Test offline in Chrome DevTools
```

### GPS Testing

**Desktop:** Use Chrome DevTools → Sensors → Location  
**Mobile:** Test on actual device with real GPS  
**iOS:** Verify wake lock fallback and checklist  
**Android:** Verify Wake Lock API functionality

---

## 🐛 Troubleshooting

### Common Issues

**GPS Not Working:**
- Check browser location permissions
- Ensure HTTPS in production
- Verify Geolocation API support

**localStorage Full:**
- Export data to CSV
- Clear old trips in Settings
- Reset all data if needed

**Service Worker Issues:**
- Unregister in DevTools → Application
- Clear cache and reload
- Rebuild production

**Build Failures:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## 📱 Platform Support

### Tested Platforms

| Platform | GPS | Wake Lock | Notes |
|----------|-----|-----------|-------|
| **Android Chrome** | ✅ | ✅ | Full support, optimal experience |
| **iOS Safari** | ✅ | ⚠️ | GPS works, wake lock uses fallback |
| **Desktop Chrome** | ⚠️ | ✅ | Simulated GPS, full dev support |
| **Desktop Firefox** | ⚠️ | ❌ | Simulated GPS, no wake lock |

### Browser Requirements

**Minimum:**
- ES2017+ support
- Geolocation API
- localStorage API
- Service Worker API (for PWA)

**Recommended:**
- Chrome 90+ (Android)
- Safari 14+ (iOS)
- Chrome/Firefox latest (Desktop)

---

## 🔐 Security & Privacy

### Data Privacy
- **Local-Only Storage:** All data in browser localStorage
- **No Cloud Sync:** No backend or external services
- **No Tracking:** No analytics or telemetry
- **User Owns Data:** Full control via export/delete

### Security
- **PIN Protection:** Simple hash-based authentication
- **Session Timeout:** 7-day automatic logout
- **Local Device Only:** No network transmission
- **Data Deletion:** Clear trips or reset everything

---

## 📦 Deployment

### Recommended Platforms

**Vercel (Easiest):**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm run build
# Deploy .next/ directory
```

**Requirements:**
- HTTPS required (for GPS API)
- Static hosting sufficient
- No server-side rendering needed

---

## 🤝 Contributing

### Development Workflow

1. **Clone repository**
2. **Install dependencies:** `npm install`
3. **Create feature branch:** `git checkout -b feature/name`
4. **Make changes**
5. **Test thoroughly**
6. **Commit:** `git commit -m "Description"`
7. **Push:** `git push origin feature/name`

### Code Style

- TypeScript strict mode
- Functional React components
- TailwindCSS for styling
- ESLint for code quality

---

## 📄 License

All data stored locally on device only. No external services or tracking.

---

## 📞 Support

### Documentation
- [Project Overview](./project-overview.md) - Start here
- [Development Guide](./development-guide.md) - Setup and workflow
- [Architecture](./architecture.md) - Technical details

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

## 📈 Project Stats

| Metric | Value |
|--------|-------|
| **Total Components** | 15+ |
| **Custom Hooks** | 4 |
| **Utility Modules** | 3 |
| **Lines of Code** | ~2,400+ |
| **Dependencies** | 6 production, 6 dev |
| **Bundle Size** | ~200-300 KB (first load) |

---

**Last Updated:** 2026-01-25  
**Documentation Version:** 1.0  
**Project Version:** 0.1.0

---

## 🗺️ Documentation Map

```
docs/
├── index.md                    # ← You are here
├── project-overview.md         # High-level summary
├── architecture.md             # Technical architecture
├── component-inventory.md      # Component catalog
├── source-tree-analysis.md     # File structure
├── data-models.md              # Data structures
└── development-guide.md        # Setup & workflow
```

**Start with:** [Project Overview](./project-overview.md) for a high-level understanding, then dive into specific topics as needed.
