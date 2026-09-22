import { ScreenSpecData } from './DeveloperScreenSpecCard';

export const SCREEN_SPECS: Record<string, ScreenSpecData> = {
  // ==========================================
  // 02 — ADMIN (DSWD REGIONAL DIRECTOR)
  // ==========================================
  dashboard: {
    screenId: 'dashboard',
    screenCode: 'ADM-01',
    screenName: 'Executive Regional Dashboard & GIS Casemix',
    chapter: '02 — Admin',
    persona: 'Atty. Carmelita Mendoza, CESO III',
    roleTitle: 'Regional Director (Executive Admin)',
    purpose: 'Provides executive visibility into the regional 4Ps beneficiary casemix, high-risk discrepancy clusters across Laguna municipalities, and direct shortcuts to dispatch triage tasks.',
    endpoint: 'GET /api/v1/dashboard/summary',
    contractFile: 'admin-triage-feed.json',
    navigation: {
      sidebarActive: 'Executive Overview',
      breadcrumbs: ['Portal', 'Executive Administration', 'Regional Overview'],
      allowedRoles: ['DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Bento grid: 4 top stat tiles (col-span-1 each) + 2/3 Map / 1/3 Alert breakdown',
      breakpoints: 'Mobile stacks into 1-col; Desktop splits 2-col (65% / 35%)'
    },
    components: [
      { id: 'COMP-STAT-01', name: 'Executive Stat Tiles', type: 'StatTile', description: '4 tiles displaying Total Active Beneficiaries, Flagged Discrepancies, Active Dispatches, and Due Process Notices.' },
      { id: 'COMP-MAP-01', name: 'Laguna Cluster GIS Map', type: 'Card', description: 'SVG interactive map with pin indicators for Santa Rosa, Calamba, San Pedro, and Biñan.' },
      { id: 'COMP-FEED-01', name: 'High-Priority Alert Docket', type: 'Card', description: 'Real-time feed of urgent cases scoring Si ≥ 80 with direct Dispatch buttons.' }
    ],
    actions: [
      { trigger: 'Click "Triage Queue" button', target: 'Screen: triage (ADM-02)', type: 'Navigation', description: 'Navigates to full filterable triage docket.' },
      { trigger: 'Click "Dispatch Task" on quick card', target: 'Modal: dispatch_modal (ADM-04)', type: 'Modal Open', description: 'Opens task assignment dialog pre-filled with household ID.' },
      { trigger: 'Click municipality on map', target: 'Filtered Triage Queue', type: 'Navigation', description: 'Filters triage view by selected municipality.' }
    ],
    tableSpecs: [
      {
        tableName: 'Urgent Flagged Cases Feed',
        columns: [
          { name: 'Household ID', type: 'string (font-mono)', sortable: false },
          { name: 'Head of Household', type: 'string', sortable: false },
          { name: 'Severity', type: 'badge', sortable: true },
          { name: 'Risk Score', type: 'number', sortable: true },
          { name: 'Primary Trigger', type: 'pill', sortable: false },
          { name: 'Actions', type: 'button', sortable: false }
        ],
        rowActions: ['Dispatch Verification Task', 'View Details'],
        pagination: 'Top 5 recent records with link to view all 32'
      }
    ],
    states: {
      normal: 'Renders full KPI dashboard with live regional stats and responsive GIS indicators.',
      loading: 'Displays 4 skeleton metric cards and shaded map placeholder with subtle pulsing gradient.',
      empty: 'Displays zero-discrepancy celebration card if no cases exceed risk threshold Si ≥ 70.',
      error: 'Shows banner: "Unable to retrieve GovCloud regional analytics. Retrying in 10s."'
    },
    developerNotes: [
      'Stat cards must use mathematical padding: container outer padding = 20px, inner item gap = 12px.',
      'No purple-to-blue gradients allowed. Use DSWD Navy (#132e4f) and Bagong Pilipinas Gold (#b48c36).',
      'The map pins are interactive SVG coordinates scaled responsively with viewBox="0 0 500 350".'
    ]
  },

  triage: {
    screenId: 'triage',
    screenCode: 'ADM-02',
    screenName: 'Triage Queue & Flagged Cases Docket',
    chapter: '02 — Admin',
    persona: 'Atty. Carmelita Mendoza, CESO III',
    roleTitle: 'Regional Director (Executive Admin)',
    purpose: 'Exposes cross-registry anomaly detection outputs (Meralco 200 kWh breach, LTO 4-wheel vehicle, real estate titling) for triage, inspection, and assignment to field caseworkers.',
    endpoint: 'GET /api/v1/triage/queue',
    contractFile: 'admin-triage-feed.json',
    navigation: {
      sidebarActive: 'Triage & Flagged Queue',
      breadcrumbs: ['Portal', 'Executive Administration', 'Triage Docket'],
      allowedRoles: ['DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Filter bar on top, followed by full-width responsive tabular card docket.',
      breakpoints: 'Desktop renders multi-column table; Tablet/Mobile renders responsive card layout with full details collapsible.'
    },
    components: [
      { id: 'COMP-FILTER-01', name: 'Triage Filter & Search Bar', type: 'Form', description: 'Search by Household ID / PhilSys ID, filter by Severity (All/Critical/High/Medium), and Municipality.' },
      { id: 'COMP-TABLE-01', name: 'Triage Beneficiary Table', type: 'Table', description: 'Main registry comparison table highlighting enrolled vs predicted SWDI levels, triggers, and discrepancy data.' },
      { id: 'COMP-BADGE-01', name: 'Cross-Match Trigger Badges', type: 'Badge', description: 'Color-coded tags: Meralco kWh, LTO Vehicle, LandBank Sangla ATM.' }
    ],
    actions: [
      { trigger: 'Click "Dispatch Task" button on row', target: 'Modal: dispatch_modal', type: 'Modal Open', description: 'Passes selected household payload to Task Dispatch Dialog.' },
      { trigger: 'Type search query in search field', target: 'Filtered Table State', type: 'State Mutation', description: 'Filters displayed rows instantly by name, ID, or PhilSys number.' },
      { trigger: 'Click severity filter tab', target: 'Filtered Table State', type: 'State Mutation', description: 'Filters list to CRITICAL (Si ≥ 85), HIGH (Si ≥ 70), etc.' }
    ],
    formsAndInputs: [
      { field: 'search_query', type: 'string', required: false, validation: 'Sanitized text input', description: 'Free text filter for beneficiary name, PhilSys ID, or 4Ps household number.' },
      { field: 'municipality_filter', type: 'select', required: false, validation: 'Valid municipality ID or ALL', description: 'Filters table by Laguna pilot municipality.' }
    ],
    tableSpecs: [
      {
        tableName: 'Flagged Anomaly Registry',
        columns: [
          { name: 'Household ID', type: 'font-mono', sortable: true },
          { name: 'Beneficiary Name & PhilSys', type: 'string', sortable: true },
          { name: 'Location', type: 'string', sortable: true },
          { name: 'SWDI Level Inversion', type: 'badge', sortable: false },
          { name: 'Cross-Match Triggers', type: 'badges', sortable: false },
          { name: 'Composite Risk (Si)', type: 'progress bar + score', sortable: true },
          { name: 'Action', type: 'primary button', sortable: false }
        ],
        rowActions: ['Dispatch Task', 'Inspect Cross-Match Data'],
        pagination: 'Client-side pagination (10 per page)'
      }
    ],
    states: {
      normal: 'Lists all 32 flagged households sorted by descending composite risk score.',
      loading: 'Shows table row skeletons with animated pulse effect.',
      empty: 'Displays empty state: "No flagged households match your search criteria."',
      error: 'Shows error banner with Retry button if GovCloud cross-match fails.'
    },
    developerNotes: [
      'Composite risk score color math: Si >= 80 -> rose-700/rose-50; Si >= 65 -> amber-700/amber-50.',
      'Ensure PhilSys numbers are masked in accordance with Data Privacy Act of 2012 (RA 10173).'
    ]
  },

  dispatch_manager: {
    screenId: 'dispatch_manager',
    screenCode: 'ADM-03',
    screenName: 'Caseworker Operations & Dispatch Manager',
    chapter: '02 — Admin',
    persona: 'Atty. Carmelita Mendoza, CESO III',
    roleTitle: 'Regional Director (Executive Admin)',
    purpose: 'Administrative control room for balancing fieldwork loads across Municipal Links, setting turnaround SLAs, and monitoring active field task statuses.',
    endpoint: 'GET /api/v1/tasks/operations',
    contractFile: 'admin-task-dispatch.json',
    navigation: {
      sidebarActive: 'Caseworker Dispatch',
      breadcrumbs: ['Portal', 'Executive Administration', 'Caseworker Operations'],
      allowedRoles: ['DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: '2-column layout: Left column = Caseworker roster with workload gauges; Right column = Recent dispatches list.',
      breakpoints: '1-col on mobile/tablet (<1024px), 2-col on desktop (>=1024px).'
    },
    components: [
      { id: 'COMP-ROSTER-01', name: 'Caseworker Workload Roster', type: 'Card', description: 'Lists active field officers with capacity progress bars, open tasks, and active clusters.' },
      { id: 'COMP-DISPATCH-LIST', name: 'Active Dispatches Registry', type: 'Table', description: 'Table of tasks currently in the field, countdown to SLA deadline, and sync state.' }
    ],
    actions: [
      { trigger: 'Click "Quick Dispatch" on caseworker card', target: 'Modal: dispatch_modal', type: 'Modal Open', description: 'Opens dispatch modal pre-assigning that specific caseworker.' },
      { trigger: 'Click "Reassign Task"', target: 'Reassign Prompt', type: 'State Mutation', description: 'Transfers overdue task from one caseworker to another.' }
    ],
    states: {
      normal: 'Displays 3 field caseworkers and 24 active dispatches across Laguna cluster.',
      loading: 'Skeleton workload cards with pulsing progress bars.',
      empty: 'Displays zero-state: "All field tasks completed. No open investigations."',
      error: 'Displays connection alert.'
    },
    developerNotes: [
      'Enforce maximum capacity limit: Caseworker with >= 10 open tasks receives a "High Load" warning badge.'
    ]
  },

  dispatch_modal: {
    screenId: 'dispatch_modal',
    screenCode: 'ADM-04',
    screenName: 'Field Task Assignment Dialog',
    chapter: '02 — Admin',
    persona: 'Atty. Carmelita Mendoza, CESO III',
    roleTitle: 'Regional Director (Executive Admin)',
    purpose: 'Modal dialog used to configure verification instructions, select the designated Municipal Link, set SLA completion deadline, and dispatch the task to the field tablet PWA.',
    endpoint: 'POST /api/v1/tasks/dispatch',
    contractFile: 'admin-task-dispatch.json',
    navigation: {
      sidebarActive: 'Triage / Caseworker Dispatch',
      breadcrumbs: ['Portal', 'Triage Queue', 'Assign Task Modal'],
      allowedRoles: ['DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fluid Container',
      padding: 'max-w-lg mx-auto p-6',
      gridStructure: 'Modal dialog overlay with fixed header, scrollable form body, and sticky action footer.',
      breakpoints: 'Full-screen sheet on mobile (<640px); Centered modal on desktop.'
    },
    components: [
      { id: 'COMP-MODAL-01', name: 'Dispatch Modal Shell', type: 'Modal', description: 'Accessible modal dialog with ESC key dismissal and backdrop click handler.' },
      { id: 'COMP-BENEFICIARY-BANNER', name: 'Beneficiary Summary Header', type: 'Card', description: 'Highlights household ID, head of household name, PhilSys ID, and triggers.' }
    ],
    actions: [
      { trigger: 'Click "Confirm & Dispatch Task"', target: 'POST /api/v1/tasks/dispatch', type: 'API Call', description: 'Submits dispatch payload, closes modal, and shows success toast.' },
      { trigger: 'Click "Cancel" or Close Icon (X)', target: 'Dismiss Modal', type: 'Modal Open', description: 'Aborts assignment without state changes.' }
    ],
    formsAndInputs: [
      { field: 'household_id', type: 'string (hidden/readonly)', required: true, validation: 'Valid 4Ps ID format', description: 'Target beneficiary identifier.' },
      { field: 'assigned_worker_id', type: 'select', required: true, validation: 'Non-empty selection', description: 'Selects designated Municipal Link (e.g., Marvin Bautista, RSW).' },
      { field: 'due_date', type: 'date', required: true, validation: 'Must be within 3 to 14 days from today', description: 'Field investigation deadline.' },
      { field: 'assignment_notes', type: 'textarea', required: false, validation: 'Max 500 chars', description: 'Specific instructions (e.g., verify motorcycle livelihood use).' }
    ],
    states: {
      normal: 'Form populated with selected household data and sensible defaults.',
      loading: 'Button shows spinner: "Transmitting Task to Field Cache..."',
      empty: 'N/A',
      error: 'Form displays inline validation errors if required fields are missing.'
    },
    developerNotes: [
      'Must trap focus inside modal while open for WCAG 2.1 compliance.',
      'Return focus to triggering button upon modal close.'
    ]
  },

  admin_settings: {
    screenId: 'admin_settings',
    screenCode: 'ADM-05',
    screenName: 'Policy Thresholds & Algorithm Settings',
    chapter: '02 — Admin',
    persona: 'Atty. Carmelita Mendoza, CESO III',
    roleTitle: 'Regional Director (Executive Admin)',
    purpose: 'Allows authorized directors to tune cross-registry matching parameters, including Meralco lifeline limits, risk score weights, and statutory appeal windows.',
    endpoint: 'PUT /api/v1/admin/settings',
    contractFile: 'admin-policy-settings.json',
    navigation: {
      sidebarActive: 'Policy Thresholds',
      breadcrumbs: ['Portal', 'Executive Administration', 'Settings & Policy Calibration'],
      allowedRoles: ['DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: '2-column layout: Left column = Policy sliders and cutoff thresholds; Right column = Audit log of parameter adjustments.',
      breakpoints: '1-col on mobile, 2-col on desktop (>=1024px).'
    },
    components: [
      { id: 'COMP-SLIDERS-01', name: 'Threshold Calibration Controls', type: 'Form', description: 'Sliders and number inputs for Meralco kWh cutoff, composite risk cutoff, and statutory notice days.' }
    ],
    actions: [
      { trigger: 'Click "Save Threshold Settings"', target: 'PUT /api/v1/admin/settings', type: 'API Call', description: 'Commits calibrated policy parameters and generates an immutable audit log entry.' }
    ],
    states: {
      normal: 'Displays current policy constants (200 kWh, 70/100 risk cutoff, 15 days notice).',
      loading: 'Pulsing skeleton controls.',
      empty: 'N/A',
      error: 'Displays validation warning if values violate RA 11310 statutory requirements.'
    },
    developerNotes: [
      'The 15-day statutory window cannot be lowered below 15 days due to Section 12 of RA 11310.'
    ]
  },

  // ==========================================
  // 03 — CASE WORKER PERSONA 1 (MUNICIPAL LINK)
  // ==========================================
  field_dashboard: {
    screenId: 'field_dashboard',
    screenCode: 'ML-01',
    screenName: 'Caseworker Operational Hub',
    chapter: '03 — Case Worker Persona 1',
    persona: 'Marvin Bautista, RSW',
    roleTitle: 'Municipal Link (Field Caseworker)',
    purpose: 'Tablet-optimized personal operational command center for the field caseworker showing today’s verification itinerary, offline cache sync status, and quick-start actions.',
    endpoint: 'GET /api/v1/field/caseworker-hub',
    contractFile: 'field-task-download.json',
    navigation: {
      sidebarActive: 'Caseworker Hub',
      breadcrumbs: ['Field PWA', 'Municipal Link Operations', 'Personal Hub'],
      allowedRoles: ['MUNICIPAL_LINK']
    },
    layout: {
      containerType: 'Tablet PWA Shell',
      padding: 'p-4 sm:p-6 space-y-5',
      gridStructure: 'Stacked touch cards: Cluster itinerary on top, priority households next, offline sync tray below.',
      breakpoints: 'Designed mobile-first for 768px-1024px touch screens.'
    },
    components: [
      { id: 'COMP-HUB-STAT', name: 'Caseworker Stats Tray', type: 'StatTile', description: 'Displays Assigned Cases (12), Urgent Visits Remaining (3), and Offline Stored (12).' },
      { id: 'COMP-ITINERARY', name: 'Barangay Itinerary Card', type: 'Card', description: 'Highlights target barangays for today: Brgy. Makiling and Brgy. Canlubang.' }
    ],
    actions: [
      { trigger: 'Click "Begin Field Visit"', target: 'Screen: field_verify (ML-03)', type: 'Navigation', description: 'Immediately opens 5-step verification form for top prioritized task.' },
      { trigger: 'Click "View All Assigned Tasks"', target: 'Screen: field_tasks (ML-02)', type: 'Navigation', description: 'Navigates to full task list with search and barangay filter.' },
      { trigger: 'Click "Sync Offline Storage"', target: 'Screen: field_sync (ML-04)', type: 'Modal Open', description: 'Opens offline cache sync drawer.' }
    ],
    states: {
      normal: 'Displays active schedule, pending households, and online connectivity indicator.',
      loading: 'Pulsing card skeletons with loading spinner.',
      empty: 'Displays: "All scheduled field visits completed for this week."',
      error: 'Shows offline banner: "Operating in Offline Field Cache Mode. All actions stored locally."',
      offline: 'Fully functional in offline mode using IndexedDB cache.'
    },
    developerNotes: [
      'Touch targets must be at least 44px by 44px across all buttons.',
      'Must support seamless offline operation with zero network dependencies.'
    ]
  },

  field_tasks: {
    screenId: 'field_tasks',
    screenCode: 'ML-02',
    screenName: 'Assigned Field Verification Tasks Queue',
    chapter: '03 — Case Worker Persona 1',
    persona: 'Marvin Bautista, RSW',
    roleTitle: 'Municipal Link (Field Caseworker)',
    purpose: 'Lists all assigned field investigation tasks with filter by barangay, urgency badge, PhilSys card status, and direct button to start on-site assessment.',
    endpoint: 'GET /api/v1/field/tasks',
    contractFile: 'field-task-download.json',
    navigation: {
      sidebarActive: 'Assigned Field Tasks',
      breadcrumbs: ['Field PWA', 'Municipal Link Operations', 'Tasks Queue'],
      allowedRoles: ['MUNICIPAL_LINK']
    },
    layout: {
      containerType: 'Tablet PWA Shell',
      padding: 'p-4 sm:p-6 space-y-4',
      gridStructure: 'Single-column list of touch-friendly task cards with action buttons.',
      breakpoints: 'Fluid full-width cards optimized for single-hand scrolling.'
    },
    components: [
      { id: 'COMP-TASK-CARD', name: 'Field Task Touch Card', type: 'Card', description: 'Displays household ID, head of family, address, trigger badges, and "Start Verification" button.' }
    ],
    actions: [
      { trigger: 'Click "Start Verification Form"', target: 'Screen: field_verify (ML-03)', type: 'Navigation', description: 'Launches step-by-step SWDI assessment form.' }
    ],
    states: {
      normal: 'Lists assigned tasks sorted by urgency and SLA deadline.',
      loading: 'Shows 3 pulsing task card placeholders.',
      empty: 'Shows: "No pending field tasks assigned."',
      error: 'Shows local cached data with offline badge.'
    },
    developerNotes: [
      'Card clicking expands quick summary without leaving the screen.'
    ]
  },

  field_verify: {
    screenId: 'field_verify',
    screenCode: 'ML-03',
    screenName: '5-Step Field Assessment Form (SWDI + Assets)',
    chapter: '03 — Case Worker Persona 1',
    persona: 'Marvin Bautista, RSW',
    roleTitle: 'Municipal Link (Field Caseworker)',
    purpose: 'Step-by-step digital field evaluation instrument capturing housing materials, motorcycle productive asset proof, LandBank cash card physical custody, and geo-tagged photo evidence.',
    endpoint: 'POST /api/v1/field/tasks/{task_id}/submit',
    contractFile: 'field-task-submission.json',
    navigation: {
      sidebarActive: 'Assigned Field Tasks',
      breadcrumbs: ['Field PWA', 'Tasks Queue', 'Assessment Form'],
      allowedRoles: ['MUNICIPAL_LINK']
    },
    layout: {
      containerType: 'Tablet PWA Shell',
      padding: 'p-4 sm:p-6 space-y-5',
      gridStructure: 'Stepper header on top + active step question card in center + navigation bar on bottom.',
      breakpoints: 'Mobile/Tablet touch-first stepper.'
    },
    components: [
      { id: 'COMP-STEPPER', name: '5-Step Form Stepper', type: 'Navigation', description: 'Visual progress bar: 1. Housing -> 2. Assets -> 3. LandBank -> 4. Evidence -> 5. Summary.' },
      { id: 'COMP-EVIDENCE-UPLOAD', name: 'Geo-Tagged Photo Capture', type: 'Form', description: 'Camera upload button with simulated GPS coordinate stamping and client-side SHA-256 hash.' }
    ],
    actions: [
      { trigger: 'Click "Next Step"', target: 'Next Step in Form', type: 'State Mutation', description: 'Validates current step and transitions to next.' },
      { trigger: 'Click "Previous Step"', target: 'Prior Step in Form', type: 'State Mutation', description: 'Returns to previous step preserving entered values.' },
      { trigger: 'Click "Submit Verification"', target: 'Offline Storage & Sync Drawer', type: 'Offline Cache', description: 'Saves completed submission payload to IndexedDB storage.' }
    ],
    formsAndInputs: [
      { field: 'wall_construction', type: 'radio', required: true, validation: '1=Light, 2=Mixed, 3=Strong', description: 'Physical housing material score.' },
      { field: 'is_motorcycle_present', type: 'boolean', required: true, validation: 'Boolean toggle', description: 'Confirms physical presence of motorcycle.' },
      { field: 'is_productive_asset', type: 'boolean', required: true, validation: 'Boolean toggle', description: 'Verifies use for livelihood (Grab/MoveIt/Tricycle).' },
      { field: 'physical_card_presented', type: 'boolean', required: true, validation: 'Boolean toggle', description: 'Confirms LandBank ATM card is in physical custody (anti-sangla ATM check).' }
    ],
    states: {
      normal: 'Interactive 5-step form with live validation feedback.',
      loading: 'Uploading evidence spinner.',
      empty: 'N/A',
      error: 'Displays inline validation errors for incomplete required checks.',
      offline: 'Stores full submission payload directly to browser IndexedDB with PENDING_SYNC state.'
    },
    developerNotes: [
      'Form state MUST auto-save locally to prevent data loss if battery dies in the field.'
    ]
  },

  field_sync: {
    screenId: 'field_sync',
    screenCode: 'ML-04',
    screenName: 'Offline Cache & GovCloud Sync Drawer',
    chapter: '03 — Case Worker Persona 1',
    persona: 'Marvin Bautista, RSW',
    roleTitle: 'Municipal Link (Field Caseworker)',
    purpose: 'Manages local IndexedDB storage queue, showing pending field reports, photo evidence file sizes, and providing a batch push button when cellular or Wi-Fi connectivity is restored.',
    endpoint: 'POST /api/v1/field/sync-batch',
    contractFile: 'field-sync-queue.json',
    navigation: {
      sidebarActive: 'Offline Storage',
      breadcrumbs: ['Field PWA', 'Municipal Link Operations', 'Sync Queue Drawer'],
      allowedRoles: ['MUNICIPAL_LINK']
    },
    layout: {
      containerType: 'Tablet PWA Shell',
      padding: 'p-4 sm:p-6 space-y-4',
      gridStructure: 'Slide-out drawer or full-screen modal with sync progress bar and itemized queue list.',
      breakpoints: 'Responsive drawer scaling from 400px width on tablet to full width on mobile.'
    },
    components: [
      { id: 'COMP-SYNC-DRAWER', name: 'IndexedDB Sync Queue', type: 'Modal', description: 'Lists cached reports with status badges (PENDING_SYNC, SYNCED).' }
    ],
    actions: [
      { trigger: 'Click "Push All Reports to GovCloud"', target: 'POST /api/v1/field/sync-batch', type: 'API Call', description: 'Transmits all pending local reports in a single atomic batch.' }
    ],
    states: {
      normal: 'Shows list of pending reports with green sync button.',
      loading: 'Syncing animation with progress bar: "Uploading report 1 of 3..."',
      empty: 'Displays: "All local reports synced. Offline storage is clean."',
      error: 'Shows warning: "GovCloud endpoint unreachable. Records remain safely stored on device."'
    },
    developerNotes: [
      'Use exponential backoff if network drops mid-batch sync.'
    ]
  },

  // ==========================================
  // 04 — CASE WORKER PERSONA 2 (GRIEVANCE & APPEALS)
  // ==========================================
  grievance_dashboard: {
    screenId: 'grievance_dashboard',
    screenCode: 'GPO-01',
    screenName: 'Grievance & Appeals Operational Hub',
    chapter: '04 — Case Worker Persona 2',
    persona: 'Rochelle Castillo, MSSW',
    roleTitle: 'Social Welfare Officer II (Due Process & Appeals)',
    purpose: 'Operational headquarters for the Grievance & Appeals caseworker managing formal beneficiary contestations, evidentiary hearings, and statutory due process timelines under Section 12 of RA 11310.',
    endpoint: 'GET /api/v1/due-process/appeals/summary',
    contractFile: 'admin-due-process.json',
    navigation: {
      sidebarActive: 'Appeals Hub',
      breadcrumbs: ['Portal', 'Grievance & Due Process Division', 'Appeals Hub'],
      allowedRoles: ['GRIEVANCE_OFFICER']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Bento grid: 4 statutory KPI tiles + 2-column layout (Left: Active Appeal Dockets, Right: Upcoming Evidentiary Hearings).',
      breakpoints: '1-col on mobile, 2-col on desktop (>=1024px).'
    },
    components: [
      { id: 'COMP-DUE-STAT', name: 'Due Process Stat Tiles', type: 'StatTile', description: 'Displays Active Notices (3), Under Evidentiary Hearing (1), Hearings Scheduled This Week (2), and Reinstated Beneficiaries (5).' },
      { id: 'COMP-LEGAL-BANNER', name: 'Statutory Safeguard Banner', type: 'Card', description: 'Cites RA 11310 Section 12: Mandatory 15-day notice and continuity of cash grant during appeal.' }
    ],
    actions: [
      { trigger: 'Click "Manage 15-Day Dockets"', target: 'Screen: due_process (GPO-02)', type: 'Navigation', description: 'Opens full docket countdown list.' },
      { trigger: 'Click "Schedule Hearing"', target: 'Modal: appeal_hearing (GPO-03)', type: 'Modal Open', description: 'Launches hearing scheduling modal.' }
    ],
    states: {
      normal: 'Displays active appeals dockets with live countdown and scheduled hearings.',
      loading: 'Pulsing stat tiles.',
      empty: 'Shows: "No active appeals pending review. All due process dockets resolved."',
      error: 'Connection error banner.'
    },
    developerNotes: [
      'Cash grants must remain active while appeal status is UNDER_APPEAL_HEARING.'
    ]
  },

  due_process: {
    screenId: 'due_process',
    screenCode: 'GPO-02',
    screenName: '15-Day Statutory Due Process & Appeals Docket',
    chapter: '04 — Case Worker Persona 2',
    persona: 'Rochelle Castillo, MSSW',
    roleTitle: 'Social Welfare Officer II (Due Process & Appeals)',
    purpose: 'Visual 15-day statutory countdown tracker for served Notices of Ineligibility. Allows filing appeals, pausing the de-listing countdown clock, and scheduling formal evidentiary hearings.',
    endpoint: 'GET /api/v1/due-process/notices',
    contractFile: 'admin-due-process.json',
    navigation: {
      sidebarActive: '15-Day Due Process',
      breadcrumbs: ['Portal', 'Grievance & Due Process Division', '15-Day Appeals Docket'],
      allowedRoles: ['GRIEVANCE_OFFICER', 'DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Single-column list of comprehensive due process docket cards with countdown progress bars.',
      breakpoints: 'Stacks on mobile, wide horizontal card layout on desktop.'
    },
    components: [
      { id: 'COMP-COUNTDOWN-CARD', name: '15-Day Countdown Docket Card', type: 'Card', description: 'Displays household info, grounds for notice, real-time remaining countdown (days/hours), progress bar, and action buttons.' }
    ],
    actions: [
      { trigger: 'Click "File Appeal & Pause Countdown"', target: 'Modal: appeal_hearing', type: 'Modal Open', description: 'Opens appeal docket registration modal.' },
      { trigger: 'Click "Finalize Revocation"', target: 'POST /api/v1/due-process/finalize', type: 'API Call', description: 'Finalizes de-listing if 15-day notice expired without contestation.' }
    ],
    states: {
      normal: 'Displays all active notices with live countdown timers and status badges.',
      loading: 'Skeleton docket cards.',
      empty: 'Shows: "Zero notices currently in 15-day window."',
      error: 'Error banner.'
    },
    developerNotes: [
      'Countdown must dynamically compute remaining hours against static reference date in mock mode.'
    ]
  },

  appeal_hearing: {
    screenId: 'appeal_hearing',
    screenCode: 'GPO-03',
    screenName: 'Evidentiary Hearing Scheduling & Registration Dialog',
    chapter: '04 — Case Worker Persona 2',
    persona: 'Rochelle Castillo, MSSW',
    roleTitle: 'Social Welfare Officer II (Due Process & Appeals)',
    purpose: 'Modal dialog used to register a formal appeal contestation, assign an official Docket Number (APP-XXX-2026-XXXX), set the hearing date, and freeze the 15-day countdown.',
    endpoint: 'POST /api/v1/due-process/appeals/schedule',
    contractFile: 'admin-due-process.json',
    navigation: {
      sidebarActive: '15-Day Due Process',
      breadcrumbs: ['Portal', 'Due Process Docket', 'Hearing Registration'],
      allowedRoles: ['GRIEVANCE_OFFICER']
    },
    layout: {
      containerType: 'Fluid Container',
      padding: 'max-w-lg mx-auto p-6',
      gridStructure: 'Modal overlay with form inputs, date picker, and legal acknowledgement checkbox.',
      breakpoints: 'Centered dialog on desktop, sheet on mobile.'
    },
    components: [
      { id: 'COMP-APPEAL-MODAL', name: 'Appeal Registration Dialog', type: 'Modal', description: 'Modal dialog capturing docket ID, hearing date, and beneficiary statement.' }
    ],
    actions: [
      { trigger: 'Click "Confirm Docket & Pause Countdown"', target: 'POST /api/v1/due-process/appeals/schedule', type: 'API Call', description: 'Pauses countdown clock and updates notice status to UNDER_APPEAL_HEARING.' }
    ],
    formsAndInputs: [
      { field: 'appeal_docket_id', type: 'string', required: true, validation: 'Regex: APP-[A-Z]{3}-2026-\\d{4}', description: 'Unique statutory appeal docket identifier.' },
      { field: 'hearing_date', type: 'date', required: true, validation: 'Must be within 10 days of appeal filing', description: 'Scheduled date of evidentiary hearing.' },
      { field: 'appeal_grounds', type: 'textarea', required: true, validation: 'Min 20 chars', description: 'Beneficiary defense explanation.' }
    ],
    states: {
      normal: 'Form pre-filled with auto-generated docket ID.',
      loading: 'Button spinner: "Freezing Countdown Clock..."',
      empty: 'N/A',
      error: 'Inline form validation messages.'
    },
    developerNotes: [
      'Pausing the countdown is a strict legal mandate under Section 12 of RA 11310.'
    ]
  },

  // ==========================================
  // 05 — CASE WORKER PERSONA 3 / COA AUDITOR
  // ==========================================
  coa_dashboard: {
    screenId: 'coa_dashboard',
    screenCode: 'COA-01',
    screenName: 'State Auditor Oversight & Compliance Dashboard',
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    persona: 'Engr. Roberto Santos, CPA, CISA',
    roleTitle: 'COA State Auditor (Audit Oversight)',
    purpose: 'Executive audit oversight command center monitoring statutory compliance under COA Circular 2024-008, evidentiary sampling rates, and Merkle chain integrity.',
    endpoint: 'GET /api/v1/audit/dashboard',
    contractFile: 'coa-audit-overview.json',
    navigation: {
      sidebarActive: 'Auditor Overview',
      breadcrumbs: ['COA Portal', 'Commission on Audit', 'Oversight Dashboard'],
      allowedRoles: ['COA_AUDITOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Bento grid: Top audit metrics + 2-col layout (Left: Circular 2024-008 compliance checklist, Right: Recent Merkle verification blocks).',
      breakpoints: '1-col on mobile, 2-col on desktop (>=1024px).'
    },
    components: [
      { id: 'COMP-AUDIT-METRICS', name: 'COA Statutory Metric Cards', type: 'StatTile', description: 'Displays 4Ps Compliance Rate (94.2%), Sample Size (450), Blockchain Validated (100%), Discrepancy Rate (4.8%).' },
      { id: 'COMP-CIRCULAR-CARD', name: 'COA Circular 2024-008 Checklist', type: 'Card', description: 'Compliance audit criteria verifying due process adherence and anti-sangla ATM checks.' }
    ],
    actions: [
      { trigger: 'Click "Inspect Cryptographic Merkle Chain"', target: 'Screen: audit_ledger (COA-02)', type: 'Navigation', description: 'Opens full cryptographic ledger.' },
      { trigger: 'Click "Run Evidentiary Sampling"', target: 'Screen: coa_sampling (COA-03)', type: 'Navigation', description: 'Opens cross-match reconciliation table.' }
    ],
    states: {
      normal: 'Displays full auditor metrics with green Merkle integrity badge.',
      loading: 'Skeleton audit cards with loading indicators.',
      empty: 'N/A',
      error: 'Shows alert: "COA GovCloud ledger sync interrupted."'
    },
    developerNotes: [
      'All audit figures must display exact percentages and sampling confidence metrics (95%, e = 0.05).'
    ]
  },

  audit_ledger: {
    screenId: 'audit_ledger',
    screenCode: 'COA-02',
    screenName: 'COA Cryptographic Merkle Audit Ledger',
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    persona: 'Engr. Roberto Santos, CPA, CISA',
    roleTitle: 'COA State Auditor (Audit Oversight)',
    purpose: 'Cryptographic block inspector verifying the immutable SHA-256 hash chain of every beneficiary eligibility transition, guaranteeing non-repudiation for State Auditors.',
    endpoint: 'GET /api/v1/audit/verify-chain',
    contractFile: 'audit-chain-verification.json',
    navigation: {
      sidebarActive: 'Audit Ledger & Chain',
      breadcrumbs: ['COA Portal', 'Special Audit Unit', 'Cryptographic Ledger'],
      allowedRoles: ['COA_AUDITOR', 'DSWD_DIRECTOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: 'Verification summary banner on top, followed by sequential cryptographic block cards connected by hash linkages.',
      breakpoints: 'Horizontal block layout on desktop, stacked on mobile.'
    },
    components: [
      { id: 'COMP-MERKLE-BANNER', name: 'Merkle Root Status Card', type: 'Card', description: 'Displays latest Root Hash, total validated blocks (1,048), and "Verify All Hashes" button.' },
      { id: 'COMP-BLOCK-CARD', name: 'Cryptographic Block Inspector', type: 'Card', description: 'Shows block sequence index, timestamp, actor, transition event, previous hash, and current block SHA-256 hash.' }
    ],
    actions: [
      { trigger: 'Click "Re-verify Entire Chain"', target: 'Cryptographic Validation Loop', type: 'State Mutation', description: 'Recalculates SHA-256 hashes across all blocks in sequence.' },
      { trigger: 'Click "Export Audit Trail (CSV/JSON)"', target: 'Data Download', type: 'API Call', description: 'Downloads complete verified audit trail for COA formal working papers.' }
    ],
    states: {
      normal: 'Displays verified green Merkle chain with matching SHA-256 hashes.',
      loading: 'Shows verification progress bar: "Computing SHA-256 hash 4 of 5..."',
      empty: 'N/A',
      error: 'Red tamper alert: "CRITICAL: Merkle hash mismatch detected at Block #04! Potential unauthorized modification."'
    },
    developerNotes: [
      'Hashes must be displayed in monospace font (font-mono) with copy-to-clipboard functionality.'
    ]
  },

  coa_sampling: {
    screenId: 'coa_sampling',
    screenCode: 'COA-03',
    screenName: 'Evidentiary Sampling & Cross-Registry Reconciliation',
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    persona: 'Engr. Roberto Santos, CPA, CISA',
    roleTitle: 'COA State Auditor (Audit Oversight)',
    purpose: 'Auditor reconciliation workbench comparing 4Ps sample beneficiaries directly with external government registries (LTO motor vehicle, BIR tax, Meralco billing) to record audit findings.',
    endpoint: 'GET /api/v1/audit/sampling',
    contractFile: 'coa-sampling-ledger.json',
    navigation: {
      sidebarActive: 'Evidentiary Sampling',
      breadcrumbs: ['COA Portal', 'Special Audit Unit', 'Sampling Reconciliation'],
      allowedRoles: ['COA_AUDITOR']
    },
    layout: {
      containerType: 'Fixed Max-W 7xl',
      padding: 'p-5 sm:p-7 space-y-6',
      gridStructure: '2-column workbench: Left column = Stratified sample household list; Right column = Comparative third-party registry evidence inspector.',
      breakpoints: '1-col on mobile/tablet, 2-col on desktop (>=1024px).'
    },
    components: [
      { id: 'COMP-SAMPLING-LIST', name: 'Sampled Beneficiaries Table', type: 'Table', description: 'Lists 4Ps sample households with PhilSys ID, location, and cross-match flag count.' },
      { id: 'COMP-EVIDENCE-COMPARATOR', name: 'Registry Comparison Panel', type: 'Card', description: 'Side-by-side comparison of 4Ps declared data vs LTO / Meralco verified records.' }
    ],
    actions: [
      { trigger: 'Select household from list', target: 'Inspect Registry Evidence', type: 'State Mutation', description: 'Populates comparator panel with chosen household evidence.' },
      { trigger: 'Click "Record Auditor Finding"', target: 'POST /api/v1/audit/findings', type: 'API Call', description: 'Appends auditor note (e.g., Unexplained Wealth, Misclassified Livelihood Asset).' }
    ],
    states: {
      normal: 'Lists stratified sample of 450 beneficiaries with active selection.',
      loading: 'Pulsing table rows.',
      empty: 'Shows: "All sampled cases reconciled."',
      error: 'External registry timeout alert.'
    },
    developerNotes: [
      'Comparator cards must visually highlight differences between declared vs external registry records in amber or rose.'
    ]
  }
};
