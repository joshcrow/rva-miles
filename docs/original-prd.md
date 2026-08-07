# Product Requirement Document (PRD): Work Mileage Tracker PWA

## 1. Project Overview

**Goal:** specific Build a mobile-first Progressive Web App (PWA) to track work mileage using GPS. The app must function seamlessly on both Android and iOS devices, syncing data to a central cloud database.
**Core Value:** Automate the manual logging of odometer readings and streamline the reporting process for reimbursement.

## 2. User Persona & Context

* **User:** A dual-device user (Personal Android, Work iOS) who needs consistent tracking across both platforms.
* **Role:** Tech-savvy professional (UX/Dev background) who requires reliable data export.
* **Key Constraints:**
* Must bypass the iOS App Store (no side-loading/TestFlight).
* Must handle iOS Safari background execution limitations.



## 3. Functional Requirements

### 3.1 Authentication

* **Provider:** Supabase Auth (or Firebase Auth).
* **Methods:** Google OAuth (preferred) or Magic Link.
* **Requirement:** Persistent login state across devices.

### 3.2 Vehicle Management

* **Feature:** User must select which vehicle is being driven before starting a trip.
* **Data Structure:** `Vehicle Name`, `Make`, `Model`, `Default Vehicle` boolean.
* **Default Seed Data:**
* 2014 Subaru Outback



### 3.3 Trip Tracking (The "Active" State)

* **UI:** A prominent "Start Trip" button.
* **Active Mode:**
* When "Start" is clicked, capture `Start Timestamp` and `Start GPS Coordinates`.
* **Critical iOS Requirement:** Engage the **Screen Wake Lock API** to prevent the phone screen from locking (which kills GPS on iOS Safari). Display a UI warning: *"Keep screen active/dimmed to ensure tracking."*
* Real-time distance calculation (Haversine formula or Geolocation API accumulation).


* **Stop Mode:**
* Capture `End Timestamp` and `End GPS Coordinates`.
* Allow user to manually adjust "Total Miles" if GPS drift occurred.
* Prompt for "Trip Purpose" (optional text field).



### 3.4 Automated Reporting

* **Logic:** System must generate an Excel (.xlsx) export and email it to the user.
* **Trigger:** 10 days prior to the user-defined "Pay Day."
* **Configuration:** User settings must allow input for:
* `Next Pay Date`
* `Pay Frequency` (Bi-weekly, Monthly, etc.)


* **Report Columns:**
* Date
* Vehicle Used
* Start Time / End Time
* Start Location / End Location (Reverse Geocoded address if possible, otherwise Lat/Long)
* Total Miles
* Trip Purpose



## 4. Technical Architecture (Recommended for Windsurf)

* **Frontend:** Next.js (React) + Tailwind CSS.
* *Why:* Shadcn/ui components are easy for Windsurf to generate; excellent PWA support via `next-pwa`.


* **Backend/Database:** Supabase (PostgreSQL).
* *Why:* Zero-config backend; built-in Edge Functions for the email scheduler.


* **Maps/Location:** Leaflet.js (OpenStreetMap) or Google Maps API (if API key provided).
* **Email Service:** Resend (via Supabase Edge Functions) to send the attachments.

## 5. Risks & Known Limitations (Critical for Agent)

### 5.1 iOS Safari Constraints

* **The Issue:** iOS Safari aggressively pauses JavaScript execution when the tab is backgrounded or the screen locks.
* **The Mitigation:** The app **MUST** implement the `navigator.wakeLock` API to keep the screen alive.
* **User UX:** The UI must explicitly instruct the iOS user to keep the phone plugged in and the app visible (or in a dim state) while driving.

### 5.2 Connectivity

* **The Issue:** Driving through dead zones (e.g., rural Virginia/mountains).
* **The Mitigation:** Implement `localStorage` caching. Points are saved locally and synced to Supabase when the connection is restored.

## 6. Data Schema (Draft)

**Table: `trips**`

* `id` (uuid)
* `user_id` (uuid, fk)
* `vehicle_id` (uuid, fk)
* `start_time` (timestamptz)
* `end_time` (timestamptz)
* `start_lat` (float)
* `start_long` (float)
* `end_lat` (float)
* `end_long` (float)
* `distance_miles` (float)
* `purpose` (text)
* `status` (enum: 'in-progress', 'completed')