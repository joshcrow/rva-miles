# RVA Miles - Development Guide

**Generated:** 2026-01-25  
**Framework:** Next.js 16.1.4 with React 19

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Available Scripts](#available-scripts)
6. [Environment Setup](#environment-setup)
7. [Building for Production](#building-for-production)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x or later | JavaScript runtime |
| **npm** | 10.x or later | Package manager |
| **Git** | Any recent | Version control |

### Optional Tools

- **VS Code** - Recommended IDE with TypeScript support
- **Chrome DevTools** - For debugging and PWA testing
- **Android Studio** - For Android device testing
- **Xcode** - For iOS device testing (macOS only)

### Browser Requirements

**Development:**
- Chrome/Edge (latest) - Best DevTools support
- Firefox (latest) - Good for testing
- Safari (latest) - iOS testing

**Production:**
- Any modern browser with ES2017+ support
- Geolocation API support required
- localStorage support required

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rva-miles
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Next.js 16.1.4
- React 19.2.3
- TypeScript 5.x
- TailwindCSS 4.x
- next-pwa 5.6.0
- nosleep.js 0.12.0

**Installation Time:** ~2-3 minutes

### 3. Start Development Server

```bash
npm run dev
```

**Output:**
```
▲ Next.js 16.1.4
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.5s
```

### 4. Open in Browser

Navigate to: `http://localhost:3000`

**First Launch:**
1. You'll see the PIN setup screen
2. Create a 4+ character PIN
3. Confirm the PIN
4. You're in!

---

## Development Workflow

### Hot Module Replacement (HMR)

Next.js provides automatic hot reloading:
- Edit any file in `src/`
- Changes appear instantly in browser
- React state preserved when possible
- Full page reload on error

### Development Mode Features

**PWA Disabled in Development:**
```typescript
// next.config.ts
disable: process.env.NODE_ENV === "development"
```

**Why:** Service workers can cache aggressively and interfere with HMR.

**TypeScript Checking:**
- Real-time type checking in IDE
- Build-time type checking
- Strict mode enabled

**ESLint:**
- Automatic linting on save (if configured)
- Run manually: `npm run lint`

---

## Project Structure

### Key Directories

```
src/
├── app/              # Next.js App Router
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Main app page
│   └── globals.css  # Global styles
├── components/       # React components
│   ├── auth/        # Authentication
│   ├── trip/        # Trip features
│   ├── ui/          # Reusable UI
│   └── vehicle/     # Vehicle management
├── hooks/           # Custom React hooks
├── lib/             # Utilities
└── types/           # TypeScript types
```

### File Naming Conventions

- **Components:** PascalCase (e.g., `TripTracker.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useGeolocation.ts`)
- **Utilities:** camelCase (e.g., `storage.ts`)
- **Types:** camelCase (e.g., `index.ts`)

---

## Available Scripts

### Development

```bash
npm run dev
```
Starts development server on `http://localhost:3000`
- Hot module replacement enabled
- PWA disabled
- Source maps enabled

### Production Build

```bash
npm run build
```
Creates optimized production build
- TypeScript compilation
- Code minification
- Service worker generation
- Static optimization

**Output:** `.next/` directory

### Production Server

```bash
npm run start
```
Serves production build
- Requires `npm run build` first
- Runs on `http://localhost:3000`
- PWA enabled

### Linting

```bash
npm run lint
```
Runs ESLint on all source files
- Checks for code quality issues
- Enforces Next.js best practices

---

## Environment Setup

### No Environment Variables Needed

This project has **no environment variables** or secrets:
- No API keys
- No backend URLs
- No third-party services
- All configuration hardcoded

### TypeScript Configuration

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Path Alias:**
```typescript
// Instead of:
import { Trip } from "../../types";

// Use:
import { Trip } from "@/types";
```

### TailwindCSS Configuration

**Auto-configured with TailwindCSS 4.x**

No `tailwind.config.js` needed - uses defaults with PostCSS.

**Dark Theme:**
All components use dark theme (slate colors).

---

## Building for Production

### Build Process

```bash
npm run build
```

**Steps:**
1. TypeScript compilation
2. Next.js optimization
3. Service worker generation (PWA)
4. Static asset processing
5. Bundle analysis

**Output:**
```
.next/
├── cache/           # Build cache
├── server/          # Server bundles
├── static/          # Static assets
└── types/           # Generated types
```

### Build Optimization

**Automatic Optimizations:**
- Code splitting
- Tree shaking
- Image optimization
- Font optimization (Geist fonts)
- CSS minification

**Bundle Size:**
- First Load JS: ~200-300 KB
- Route bundles: ~50-100 KB each

### PWA Build

**Service Worker:**
- Generated automatically by next-pwa
- Caches static assets
- Offline page support
- Workbox-based

**Manifest:**
- `public/manifest.json`
- Icons: 192x192, 512x512
- Standalone display mode

---

## Testing

### Manual Testing

**Local Testing:**
1. Start dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Test features manually

**Mobile Testing:**
1. Find your local IP: `ifconfig` or `ipconfig`
2. Open `http://192.168.1.x:3000` on mobile device
3. Must be on same network

**PWA Testing:**
1. Build production: `npm run build`
2. Start server: `npm run start`
3. Open Chrome DevTools → Application → Service Workers
4. Test offline mode

### GPS Testing

**Desktop (No GPS):**
- Chrome DevTools → Sensors → Location
- Set custom coordinates
- Useful for development

**Mobile (Real GPS):**
- Test on actual device
- Go for a drive
- Verify accuracy

**iOS Specific:**
- Test wake lock fallback
- Verify pre-trip checklist
- Check screen sleep behavior

**Android Specific:**
- Test Wake Lock API
- Verify screen stays on
- Check background tracking

### Browser Testing

**Recommended Testing Matrix:**
- Chrome (Android) - Primary target
- Safari (iOS) - Secondary target
- Chrome (Desktop) - Development
- Firefox (Desktop) - Compatibility

---

## Debugging

### Browser DevTools

**Chrome DevTools:**
1. Open DevTools (F12)
2. Sources → Filesystem → Add workspace
3. Set breakpoints in source files

**React DevTools:**
1. Install React DevTools extension
2. Inspect component tree
3. View props and state

**localStorage Inspector:**
1. DevTools → Application → Local Storage
2. View all `rva-miles-*` keys
3. Edit/delete data manually

### Common Debug Scenarios

**GPS Not Working:**
```javascript
// Check in console:
navigator.geolocation.getCurrentPosition(
  (pos) => console.log('GPS OK:', pos),
  (err) => console.error('GPS Error:', err)
);
```

**localStorage Issues:**
```javascript
// Check quota:
navigator.storage.estimate().then(console.log);

// Clear all data:
localStorage.clear();
```

**Service Worker Issues:**
```javascript
// Unregister service worker:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));
```

### Logging

**Add Debug Logging:**
```typescript
// In any component:
useEffect(() => {
  console.log('Component mounted', { state });
}, []);
```

**GPS Tracking Logs:**
```typescript
// Already included in useGeolocation
console.log('GPS Point:', point);
```

---

## Common Tasks

### Adding a New Component

1. Create file: `src/components/[category]/ComponentName.tsx`
2. Define component:
```typescript
"use client";

import { useState } from "react";

interface ComponentNameProps {
  // props
}

export default function ComponentName({ }: ComponentNameProps) {
  return <div>Component</div>;
}
```
3. Import and use:
```typescript
import ComponentName from "@/components/[category]/ComponentName";
```

### Adding a New Hook

1. Create file: `src/hooks/useHookName.ts`
2. Define hook:
```typescript
"use client";

import { useState, useEffect } from "react";

export function useHookName() {
  const [state, setState] = useState();
  
  return { state };
}
```
3. Use in component:
```typescript
const { state } = useHookName();
```

### Adding a New Utility

1. Create file: `src/lib/utilityName.ts`
2. Define functions:
```typescript
export function utilityFunction(param: string): string {
  return param;
}
```
3. Import and use:
```typescript
import { utilityFunction } from "@/lib/utilityName";
```

### Modifying Data Models

1. Edit: `src/types/index.ts`
2. Update interface:
```typescript
export interface Trip {
  // ... existing fields
  newField: string;  // Add new field
}
```
3. Update storage functions in `src/lib/storage.ts`
4. Update components using the type

### Styling Components

**TailwindCSS Classes:**
```typescript
<div className="bg-slate-800 text-white p-4 rounded-xl">
  Content
</div>
```

**Conditional Classes:**
```typescript
<button className={`
  px-4 py-2 rounded-lg
  ${isActive ? 'bg-blue-600' : 'bg-slate-700'}
`}>
  Button
</button>
```

---

## Troubleshooting

### Common Issues

#### Port 3000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

#### TypeScript Errors

**Error:** Type errors in IDE

**Solution:**
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
rm -rf .next
npm run build
```

#### GPS Permission Denied

**Error:** "Location permission denied"

**Solution:**
- Check browser location permissions
- Enable location services on device
- Use HTTPS in production (required for GPS)

#### Service Worker Caching Issues

**Error:** Old code still running after update

**Solution:**
```bash
# In DevTools:
Application → Service Workers → Unregister

# Or in code:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));
```

#### localStorage Quota Exceeded

**Error:** "QuotaExceededError"

**Solution:**
```javascript
// Clear old data
localStorage.clear();

// Or export and clear trips
// Use Settings → Clear All Trips
```

#### Build Failures

**Error:** Build fails with TypeScript errors

**Solution:**
```bash
# Clean build cache
rm -rf .next node_modules
npm install
npm run build
```

---

## Development Best Practices

### Code Style

**TypeScript:**
- Use strict mode
- Define all types explicitly
- Avoid `any` type

**React:**
- Use functional components
- Use hooks for state management
- Memoize expensive calculations

**Naming:**
- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

### Performance

**Optimization Tips:**
- Use `useCallback` for event handlers
- Use `useMemo` for expensive calculations
- Avoid unnecessary re-renders
- Keep component tree shallow

**GPS Optimization:**
- Filter inaccurate points (>50m accuracy)
- Remove redundant points (<10m apart)
- Record at reasonable intervals (3s default)

### Security

**Best Practices:**
- All data stored locally (no network calls)
- PIN protection for device access
- No sensitive data in console logs
- Clear data on logout

---

## IDE Setup

### VS Code (Recommended)

**Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

**Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Debugging in VS Code

**`.vscode/launch.json`:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Next.js: debug client-side",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

---

## Deployment

### Static Hosting

**Vercel (Recommended):**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm run build
# Deploy .next/ directory
```

**GitHub Pages:**
```bash
npm run build
# Configure static export in next.config.ts
```

### HTTPS Required

**Important:** GPS APIs require HTTPS in production
- Use Vercel/Netlify (automatic HTTPS)
- Or configure SSL certificate manually

---

## Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### APIs Used
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Last Updated:** 2026-01-25  
**Next.js Version:** 16.1.4  
**Node Version:** 20.x+
