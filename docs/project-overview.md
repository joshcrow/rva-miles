# RVA Miles - Project Overview

**Generated:** 2026-01-25  
**Project Type:** Web Application (Progressive Web App)  
**Repository Structure:** Monolith

## Executive Summary

RVA Miles is a Progressive Web App (PWA) designed for tracking work-related mileage for expense reimbursement. Built with Next.js 16 and React 19, the application provides real-time GPS tracking, vehicle management, and CSV export functionality. The app is optimized for mobile devices with offline capabilities and local-first data storage.

## Project Purpose

Track work mileage trips with GPS accuracy for expense reimbursement purposes. The application:
- Records GPS-tracked trips with start/end locations
- Manages multiple vehicles
- Exports trip data to CSV format
- Provides PIN-based security for local data
- Works offline as a Progressive Web App

## Technology Stack Summary

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 16.1.4 | React framework with App Router |
| **UI Library** | React | 19.2.3 | Component-based UI |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | TailwindCSS | 4.x | Utility-first CSS |
| **PWA** | next-pwa | 5.6.0 | Progressive Web App capabilities |
| **Device APIs** | nosleep.js | 0.12.0 | Keep screen awake during tracking |
| **Build Tool** | Next.js Compiler | - | Webpack-based build |

## Architecture Type

**Client-Side Single Page Application (SPA) with PWA capabilities**

- **Pattern:** Component-based architecture with React hooks
- **State Management:** Local state with React hooks (useState, useEffect, useCallback)
- **Data Persistence:** Browser localStorage (local-first)
- **Routing:** Next.js App Router (file-based routing)
- **Rendering:** Client-side rendering with "use client" directives

## Key Features

### Core Functionality
1. **GPS Trip Tracking**
   - Real-time location tracking using Geolocation API
   - Haversine distance calculation
   - GPS point filtering for accuracy
   - Wake lock support to prevent screen sleep

2. **Vehicle Management**
   - Multiple vehicle support
   - Default vehicle selection
   - CRUD operations for vehicles

3. **Trip Management**
   - Start/stop trip tracking
   - Manual trip entry
   - Trip editing capabilities
   - Purpose/notes for each trip

4. **Data Export**
   - CSV export with date range filtering
   - Includes all trip details and GPS coordinates
   - Compatible with Excel and Google Sheets

5. **Security**
   - PIN-based authentication
   - 7-day session duration
   - Local-only data storage

### Platform-Specific Features
- **iOS:** Pre-trip checklist for optimal tracking
- **Android:** Automatic wake lock support
- **Desktop:** Full functionality with simulated GPS

## Project Structure

```
rva-miles/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── auth/        # Authentication (PIN gate)
│   │   ├── trip/        # Trip tracking & history
│   │   ├── ui/          # Reusable UI components
│   │   └── vehicle/     # Vehicle management
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   └── types/           # TypeScript type definitions
├── public/              # Static assets & PWA manifest
└── docs/                # Project documentation
```

## Data Model

### Core Entities
- **Vehicle:** User's vehicles with make, model, year
- **Trip:** GPS-tracked trips with start/end locations
- **GpsPoint:** Individual GPS coordinates with accuracy
- **UserSettings:** App preferences and configuration

### Storage Strategy
- **localStorage:** All data stored client-side
- **No backend:** Fully offline-capable
- **Data keys:** Namespaced with "rva-miles-" prefix

## Development Status

- ✅ Core trip tracking functionality
- ✅ Vehicle management
- ✅ CSV export
- ✅ PIN authentication
- ✅ PWA capabilities
- ✅ Platform-specific optimizations (iOS/Android)
- ✅ Test data generation

## Target Users

- Field workers tracking business mileage
- Contractors needing expense documentation
- Anyone requiring accurate mileage logs for reimbursement

## Documentation Index

- [Architecture Documentation](./architecture.md)
- [Component Inventory](./component-inventory.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [Data Models](./data-models.md)
- [API Reference](./api-reference.md) _(Browser APIs used)_

## Quick Start

1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Open http://localhost:3000
4. Set up a PIN on first launch
5. Add a vehicle (or use default 2014 Subaru Outback)
6. Start tracking trips!

## License & Attribution

Built with Next.js, React, and TailwindCSS.  
All data stored locally on device only.
