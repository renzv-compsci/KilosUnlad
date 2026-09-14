# Engineering Task Roadmap: Frontend Engineering & Tablet PWA
**Lead:** Markie Angelo (Supported by Renz on UI Wireframes)  
**Primary Domain:** `/client/`  
**Core Technologies:** React 18, Vite, TailwindCSS, Dexie.js (IndexedDB), Service Workers, Lucide React, Axios  
**Container:** `kilosunlad-client` (Internal Port `3000`)  

---

## 1. Context & Architecture Summary for Markie

You are building the **Client Presentation Layer & Mobile Edge Application** for **KilosUnlad**, a decision-support and forensic auditing system for the DSWD 4Ps welfare program.

Your frontend is an isolated React application built with Vite and TailwindCSS. It serves two distinct user experiences:
1. **The Desktop Web Portal (Office Mode):** Used by DSWD Regional Directors, Supervisors, and Commission on Audit (COA) inspectors. It visualizes regional risk heatmaps, displays the alert triage queue, manages task dispatching, tracks the 15-day appeal docket, and inspects the cryptographic audit ledger.
2. **The Mobile Tablet Application (Field Mode - PWA):** Used by social workers (Municipal Links) traveling to rural and mountainous areas (*sitios*) with zero cellular reception. It implements an **offline-first pattern** using `IndexedDB`, interfaces with the tablet's camera and GPS hardware, and queues reports for automatic synchronization when Wi-Fi is restored.

**Your Boundaries:**
* You do **not** write backend endpoints or database queries; you communicate with the system strictly via Axios calls to `/api/v1` matching our frozen contracts.
* In Phase 1, you do **not** need to wait for Mae's backend; you can build and render all screens immediately using the mock JSON contracts inside `/docs/contracts/`.

---

## Phase 1: Environment Verification, Shell Layout & Mock Data Views (Days 1–3)
*Goal: Verify the local Vite setup, build the responsive AppShell layout, and render UI tables using mock contract data.*

- [ ] **Task 1.1: Local Environment & Dependency Verification**
  - Paths: `/client/package.json`, `/client/vite.config.js`, `/client/tailwind.config.js`
  - Install dependencies locally via `npm install` and run the development server:
    ```bash
    npm run dev
    ```
  - Open `http://localhost:3000` in your browser.
  - *Definition of Done (DoD):* React boots with clean Tailwind styling and zero console warnings.

- [ ] **Task 1.2: Build Core AppShell & Role-Based Navigation**
  - Path: `/client/src/components/layout/` (`AppShell.jsx`, `Sidebar.jsx`, `TopNav.jsx`)
  - Build a responsive layout with a collapsible sidebar, brand header, and user profile badge.
  - Implement dynamic role switching (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`).
  - *DoD:* Clicking navigation links updates routes dynamically without page reloads.

- [ ] **Task 1.3: Build Atomic UI Primitives**
  - Path: `/client/src/components/common/` (`Button.jsx`, `InputField.jsx`, `StatusBadge.jsx`, `RiskMeter.jsx`, `Modal.jsx`)
  - Create reusable buttons, inputs, modal dialogs, and color-coded risk indicators.
  - *DoD:* Components export cleanly and handle disabled, loading, and active states.

- [ ] **Task 1.4: Prototype Triage Queue Table using Mock Data**
  - Path: `/client/src/features/triage/TriageQueue.jsx`
  - Import `/docs/contracts/admin-web/admin-triage-feed.json` as static mock data.
  - Render a table displaying Household ID, Head of Household, Barangay, Risk Score, and Trigger Badges.
  - *DoD:* Table displays all 10 sample items with color-coded risk levels (Green: Low, Amber: Medium, Red: High).

*Daily Standup Deliverable (Phase 1):*  
> "React AppShell running on Port 3000 with role-based navigation; atomic UI components built; Triage Queue rendering mock contract data."

---

## Phase 2: Offline-First Tablet PWA, Hardware Hooks & Field Checklist (Days 4–8)
*Goal: Build the mobile tablet interface that functions completely offline and captures geotagged evidence.*

- [ ] **Task 2.1: Configure PWA Service Worker & Web Manifest**
  - Paths: `/client/public/manifest.json`, `/client/public/service-worker.js`
  - Configure the web app manifest so the tablet interface can be added to the home screen.
  - Cache core HTML, CSS, and JS bundles to allow offline app startup in airplane mode.
  - *DoD:* App opens cleanly on a tablet browser with network throttling set to "Offline".

- [ ] **Task 2.2: Implement Local IndexedDB Storage (Dexie.js)**
  - Path: `/client/src/services/indexedDB.js`
  - Initialize Dexie database with stores: `assigned_tasks` and `pending_submissions`.
  - Populate `assigned_tasks` with sample data from `/docs/contracts/field-tablet/field-task-download.json`.
  - *DoD:* Tasks can be read and written locally while in offline mode.

- [ ] **Task 2.3: Build Hardware Geolocation & Photo Hasher Hooks**
  - Paths: `/client/src/hooks/useGeolocation.js`, `/client/src/utils/photoHasher.js`
  - Use `navigator.geolocation.getCurrentPosition()` with high-accuracy mode enabled.
  - Implement in-browser SHA-256 calculation using the Web Crypto API (`crypto.subtle.digest`).
  - *DoD:* Taking a photo outputs an image preview, device GPS coordinates, and a valid 64-character SHA-256 hash.

- [ ] **Task 2.4: Build Mobile Field Verification Screen**
  - Path: `/client/src/features/verification/FieldTaskForm.jsx`
  - Sections:
    1. Housing Condition Scores (Walls, Roof).
    2. Productive Asset Verification (Motorcycle MoveIt / MTOP toggle).
    3. Physical LandBank Cash Card Check (Anti-Sangla verification).
    4. Geotagged Photo Attachment with embedded coordinates.
  - Save submission payload to `IndexedDB` matching `field-task-submission.json`.
  - *DoD:* Form submission saves report locally with `is_synced: false` flag.

*Daily Standup Deliverable (Phase 2):*  
> "Tablet PWA runs offline, caches tasks in IndexedDB, captures photos with GPS and SHA-256 fingerprints."

---

## Phase 3: Admin Web Features & Live Backend API Integration (Days 9–12)
*Goal: Connect React to Mae's live Express backend and build the remaining admin screens.*

- [ ] **Task 3.1: Connect Axios API Layer & JWT Interceptor**
  - Path: `/client/src/services/api.js`
  - Configure Axios instance with `baseURL: import.meta.env.VITE_API_URL`.
  - Attach Bearer access tokens to request headers and handle 401 token refresh redirects.
  - Replace static mock data in Triage Queue with live API calls (`GET /api/v1/beneficiaries/triage-queue`).
  - *DoD:* Dashboard renders live seeded records from Mae's database.

- [ ] **Task 3.2: Build Regional Heatmap & Dashboard Visuals**
  - Path: `/client/src/features/dashboard/` (`DashboardView.jsx`, `RegionalMap.jsx`, `MetricCards.jsx`)
  - Render summary metric cards (Active Caseload, Flagged Households, Graduated Count).
  - Plot color-coded barangay pins using GeoJSON coordinates.
  - *DoD:* Dashboard visualizes geographic distribution of flagged households across Laguna.

- [ ] **Task 3.3: Build 15-Day Appeal & Due Process Manager**
  - Path: `/client/src/features/due-process/AppealManager.jsx`
  - Display households under `NOTICE_OF_INELIGIBILITY` with visual 15-day countdown timers.
  - Build docket submission modal allowing supervisors to log formal appeals and schedule hearings.
  - *DoD:* Appeals can be submitted, visually pausing the countdown clock.

- [ ] **Task 3.4: Implement Offline-to-Online Batch Synchronization**
  - Path: `/client/src/hooks/useOfflineSync.js`
  - Listen for the browser `online` event.
  - Automatically query `pending_submissions` from `IndexedDB` and POST them to Mae's `/api/v1/tasks/:id/submit`.
  - *DoD:* Reconnecting to Wi-Fi automatically uploads cached reports and marks them green.

*Daily Standup Deliverable (Phase 3):*  
> "Dashboard connected to live Express API; regional heatmap operational; offline auto-sync verified."

---

## Phase 4: COA Audit Visualizer, Stress Testing & Airplane Mode (Days 13–15)
*Goal: Build the auditor verification screen and simulate field conditions.*

- [ ] **Task 4.1: Build COA Cryptographic Chain Inspector View**
  - Path: `/client/src/features/audit-ledger/ChainInspector.jsx`
  - Display an interactive list of audit blocks showing sequence numbers, timestamps, and hashes.
  - Add a "Verify Chain" button that connects to `GET /api/v1/audit/verify-chain`.
  - Display a green shield if the chain is valid, or highlight tampered blocks in red.
  - *DoD:* Displays unbroken status on valid logs and highlights tampered blocks during testing.

- [ ] **Task 4.2: Tablet Airplane Mode Stress Test**
  - Put physical tablet/browser in Airplane Mode $\to$ Complete two field reports.
  - Re-enable connection $\to$ Confirm reports sync with zero data loss.
  - *DoD:* Reports sync cleanly with valid SHA-256 fingerprints.

*Daily Standup Deliverable (Phase 4):*  
> "COA audit chain viewer active; tablet passes airplane mode stress test with zero data loss."

---

## Phase 5: UI Polish, Responsive Auditing & Live Demo Rehearsal (Days 16–18)
*Goal: Polish animations, verify responsive tablet layouts, and rehearse demo flows.*

- [ ] **Task 5.1: Responsive Audit & Accessibility Polish**
  - Verify layout renders cleanly on tablet (1024x768) and desktop (1920x1080).
  - Add loading skeletons and clean error toasts for failed network requests.
  - *DoD:* Zero UI clipping or broken scrollbars across screen sizes.

- [ ] **Task 5.2: Live Demo Rehearsal Support**
  - Rehearse the 4 live demo scenarios with Renz and team:
    1. Displaying the incoming flagged household in the Triage Queue.
    2. Dispatching the investigation to a Municipal Link.
    3. Completing the field checklist offline on the tablet with photo capture.
    4. Running the live chain verification tool in the COA Auditor view.
  - *DoD:* Demo flows execute smoothly with zero console errors.

*Daily Standup Deliverable (Phase 5):*  
> "Frontend fully polished, responsive across devices, and ready for live capstone defense."