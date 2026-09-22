import React, { useState } from 'react';
import { 
  GitFork, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Layers, 
  Zap, 
  Lock, 
  Wifi, 
  WifiOff, 
  FileText, 
  Clock, 
  Scale, 
  Users, 
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';

interface UserFlowStep {
  stepNumber: number;
  screenName: string;
  screenCode: string;
  role: string;
  userAction: string;
  systemResponse: string;
  dataContract?: string;
}

export const UserFlowsSpec: React.FC = () => {
  const [activeFlowId, setActiveFlowId] = useState<'flow1' | 'flow2' | 'flow3' | 'flow4' | 'flow5'>('flow2');
  const [activeBreakpoint, setActiveBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [interactiveStep, setInteractiveStep] = useState<number>(1);

  const flows = {
    flow1: {
      title: 'Flow 01: Authentication & Role-Based Session Routing',
      subtitle: 'Login → Credentials Validation → JWT Token Decode → Persona Router → Isolated Dashboard',
      actor: 'All Three Personas',
      badge: 'Security & RBAC',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      steps: [
        {
          stepNumber: 1,
          screenName: 'Auth & Session Gate',
          screenCode: 'SCR-01',
          role: 'Any Officer',
          userAction: 'Selects role persona (Director / Municipal Link / COA Auditor) or enters Gov.ph credentials.',
          systemResponse: 'Authenticates against mock GovCloud auth provider and returns user session JWT.',
          dataContract: 'POST /api/v1/auth/login'
        },
        {
          stepNumber: 2,
          screenName: 'Persona Gate Router',
          screenCode: 'CORE-NAV',
          role: 'System Kernel',
          userAction: 'Client session receives JWT payload containing user.role and jurisdiction.',
          systemResponse: 'Restricts sidebar navigation items to strictly authorized modules for that persona.',
          dataContract: 'UserSession { role: UserRole }'
        },
        {
          stepNumber: 3,
          screenName: 'Designated Persona Dashboard',
          screenCode: 'ADM-01 / ML-01 / COA-01',
          role: 'Authorized User',
          userAction: 'User lands on role-tailored dashboard with relevant KPIs and assigned tasks.',
          systemResponse: 'Loads persona data while barring access to all unassigned administrative or audit controls.',
          dataContract: 'GET /api/v1/dashboard/summary'
        }
      ]
    },
    flow2: {
      title: 'Flow 02: Admin Triage to Field Dispatch Flow',
      subtitle: 'Regional Overview → Flagged Triage Queue → Anomaly Inspection → Task Dispatch Modal → Confirmation Toast',
      actor: 'DSWD Regional Director (Admin)',
      badge: 'Core Administrative Flow',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      steps: [
        {
          stepNumber: 1,
          screenName: 'Executive Regional Dashboard',
          screenCode: 'ADM-01',
          role: 'Regional Director',
          userAction: 'Director observes high-risk spike in Calamba City on the Laguna GIS map and clicks "Triage Queue".',
          systemResponse: 'Navigates to Triage Docket with Calamba City filter applied.',
          dataContract: 'GET /api/v1/dashboard/summary'
        },
        {
          stepNumber: 2,
          screenName: 'Triage & Flagged Cases Docket',
          screenCode: 'ADM-02',
          role: 'Regional Director',
          userAction: 'Reviews Household 4PS-04A-2026-00129 (Score 84.0, Meralco 385 kWh) and clicks "Dispatch Task".',
          systemResponse: 'Opens Task Assignment Dialog pre-filled with beneficiary metadata.',
          dataContract: 'GET /api/v1/triage/queue'
        },
        {
          stepNumber: 3,
          screenName: 'Field Task Assignment Dialog',
          screenCode: 'ADM-04',
          role: 'Regional Director',
          userAction: 'Assigns Municipal Link "Marvin Bautista, RSW", sets SLA due date (2026-09-24), and clicks "Confirm & Dispatch".',
          systemResponse: 'Submits payload, marks status as DISPATCHED, and displays green confirmation toast.',
          dataContract: 'POST /api/v1/tasks/dispatch'
        },
        {
          stepNumber: 4,
          screenName: 'Caseworker Operations Manager',
          screenCode: 'ADM-03',
          role: 'Regional Director',
          userAction: 'Director checks workload roster; Marvin Bautista’s active queue increments from 11 to 12.',
          systemResponse: 'Workload balance gauge updates in real time.',
          dataContract: 'GET /api/v1/tasks/operations'
        }
      ]
    },
    flow3: {
      title: 'Flow 03: Municipal Link Field Verification & Offline Sync',
      subtitle: 'Caseworker Hub → Assigned Tasks Queue → 5-Step SWDI Form → Photo Evidence → Offline Cache → GovCloud Batch Sync',
      actor: 'Municipal Link (Field Caseworker)',
      badge: 'Offline-First PWA Flow',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      steps: [
        {
          stepNumber: 1,
          screenName: 'Caseworker Operational Hub',
          screenCode: 'ML-01',
          role: 'Municipal Link',
          userAction: 'Field officer opens tablet at Barangay Makiling and taps "Begin Field Visit".',
          systemResponse: 'Launches 5-step digital verification questionnaire.',
          dataContract: 'GET /api/v1/field/caseworker-hub'
        },
        {
          stepNumber: 2,
          screenName: '5-Step Field Assessment Form',
          screenCode: 'ML-03',
          role: 'Municipal Link',
          userAction: 'Evaluates housing materials (Step 1), confirms motorcycle is a tricycle livelihood asset (Step 2), and verifies LandBank ATM card (Step 3).',
          systemResponse: 'Validates input rules and computes revised SWDI score.',
          dataContract: 'POST /api/v1/field/tasks/{id}/submit'
        },
        {
          stepNumber: 3,
          screenName: 'Geo-Stamped Photo Evidence Capture',
          screenCode: 'ML-03',
          role: 'Municipal Link',
          userAction: 'Captures photo of LandBank card and tricycle; client attaches GPS coordinates and SHA-256 hash.',
          systemResponse: 'Generates client-side cryptographic hash of evidence for audit trail.',
          dataContract: 'FieldVerificationSubmission'
        },
        {
          stepNumber: 4,
          screenName: 'Offline Cache & Sync Drawer',
          screenCode: 'ML-04',
          role: 'Municipal Link',
          userAction: 'Stores record locally in browser IndexedDB while in poor cellular area. When returning to HQ, taps "Push All Reports to GovCloud".',
          systemResponse: 'Transmits batch payload to central server; updates record status from PENDING_SYNC to SYNCED.',
          dataContract: 'POST /api/v1/field/sync-batch'
        }
      ]
    },
    flow4: {
      title: 'Flow 04: Grievance Officer 15-Day Statutory Due Process Flow',
      subtitle: 'Notice Served → 15-Day Countdown Starts → Evidentiary Appeal Received → Hearing Scheduled → Clock Frozen → Resolution',
      actor: 'Social Welfare Grievance Officer',
      badge: 'Legal Due Process (RA 11310)',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      steps: [
        {
          stepNumber: 1,
          screenName: '15-Day Due Process & Appeals Docket',
          screenCode: 'GPO-02',
          role: 'Grievance Officer',
          userAction: 'Formal Notice of Ineligibility served to beneficiary; 15-day statutory countdown commences.',
          systemResponse: 'Displays live countdown bar showing days and hours remaining. Cash grant remains active.',
          dataContract: 'GET /api/v1/due-process/notices'
        },
        {
          stepNumber: 2,
          screenName: 'Hearing Scheduling & Registration Dialog',
          screenCode: 'GPO-03',
          role: 'Grievance Officer',
          userAction: 'Beneficiary presents Barangay certificate proving illegal electrical tapping; Caseworker taps "File Appeal & Pause Countdown".',
          systemResponse: 'Assigns docket ID APP-CAL-2026-0089, freezes the 15-day countdown, and updates status to UNDER_APPEAL_HEARING.',
          dataContract: 'POST /api/v1/due-process/appeals/schedule'
        },
        {
          stepNumber: 3,
          screenName: 'Statutory Evidentiary Hearing',
          screenCode: 'GPO-01',
          role: 'Grievance Officer',
          userAction: 'Grievance officer conducts hearing on scheduled date (2026-10-08) and uploads evidentiary findings.',
          systemResponse: 'Notice either dismissed (reinstated with grant backpay) or finalized for formal de-listing.',
          dataContract: 'POST /api/v1/due-process/resolve'
        }
      ]
    },
    flow5: {
      title: 'Flow 05: COA Auditor Merkle Audit & Sampling Reconciliation',
      subtitle: 'Audit Dashboard → Cryptographic Merkle Chain → SHA-256 Linkage Inspection → Third-Party Cross-Match Sampling',
      actor: 'COA State Auditor (Audit Oversight)',
      badge: 'Statutory Audit (COA 2024-008)',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      steps: [
        {
          stepNumber: 1,
          screenName: 'State Auditor Oversight Dashboard',
          screenCode: 'COA-01',
          role: 'COA Auditor',
          userAction: 'State auditor reviews 94.2% compliance rate and taps "Inspect Cryptographic Merkle Chain".',
          systemResponse: 'Opens full cryptographic ledger.',
          dataContract: 'GET /api/v1/audit/dashboard'
        },
        {
          stepNumber: 2,
          screenName: 'Cryptographic Merkle Audit Ledger',
          screenCode: 'COA-02',
          role: 'COA Auditor',
          userAction: 'Auditor verifies that Block #03 previous_hash equals Block #02 entry_hash, proving non-repudiation.',
          systemResponse: 'Displays green verified check on all 1,048 blocks.',
          dataContract: 'GET /api/v1/audit/verify-chain'
        },
        {
          stepNumber: 3,
          screenName: 'Evidentiary Sampling Workbench',
          screenCode: 'COA-03',
          role: 'COA Auditor',
          userAction: 'Selects 4Ps sample beneficiary; system queries live LTO and Meralco registries to reconcile data discrepancies.',
          systemResponse: 'Presents side-by-side reconciliation sheet allowing auditor to log statutory audit observations.',
          dataContract: 'GET /api/v1/audit/sampling'
        }
      ]
    }
  };

  const currentFlow = flows[activeFlowId];

  return (
    <div className="max-w-7xl mx-auto p-5 sm:p-7 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-[#132e4f] text-stone-100 p-6 rounded-2xl border border-[#1c3a5e] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded bg-amber-400 text-stone-900 font-mono text-xs font-bold shadow-2xs">
                CHAPTER 06
              </span>
              <span className="text-amber-200/90 font-mono text-xs font-medium">
                User Flows & Responsive Architecture Specs
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mt-2">
              System Interaction Flows & Responsive Layout
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Detailed step-by-step developer interaction journeys documenting user actions, system state mutations, and responsive viewport behaviors across Desktop, Tablet, and Mobile.
            </p>
          </div>
        </div>

        {/* Flow Selector Pills */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'flow1', label: 'Flow 01: Auth & Routing' },
            { id: 'flow2', label: 'Flow 02: Triage to Dispatch' },
            { id: 'flow3', label: 'Flow 03: Field Verification & Sync' },
            { id: 'flow4', label: 'Flow 04: 15-Day Due Process Appeal' },
            { id: 'flow5', label: 'Flow 05: COA Merkle Audit Verification' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFlowId(f.id as any);
                setInteractiveStep(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeFlowId === f.id
                  ? 'bg-amber-400 text-stone-900 shadow-2xs font-bold'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. INTERACTIVE FLOWCHART WALKTHROUGH */}
      {/* ============================================================ */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentFlow.badgeColor}`}>
                {currentFlow.badge}
              </span>
              <span className="text-xs text-stone-500">Actor: <strong className="text-stone-900">{currentFlow.actor}</strong></span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display mt-1">
              {currentFlow.title}
            </h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {currentFlow.subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setInteractiveStep((prev) => Math.max(1, prev - 1))}
              disabled={interactiveStep === 1}
              className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setInteractiveStep((prev) => Math.min(currentFlow.steps.length, prev + 1))}
              disabled={interactiveStep === currentFlow.steps.length}
              className="px-3 py-1.5 bg-[#132e4f] text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center space-x-1"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setInteractiveStep(1)}
              className="p-1.5 text-stone-400 hover:text-stone-700 transition"
              title="Reset Flow"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step-by-Step Interactive Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {currentFlow.steps.map((step) => {
            const isCurrent = interactiveStep === step.stepNumber;
            const isPast = interactiveStep > step.stepNumber;

            return (
              <div
                key={step.stepNumber}
                onClick={() => setInteractiveStep(step.stepNumber)}
                className={`p-4 rounded-xl border transition cursor-pointer relative ${
                  isCurrent
                    ? 'bg-blue-50/70 border-[#132e4f] ring-2 ring-[#132e4f]/20 shadow-xs'
                    : isPast
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : 'bg-stone-50 border-stone-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-[#132e4f] text-white'
                      : isPast
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {step.stepNumber}
                  </span>
                  <span className="font-mono text-[10px] text-stone-500 font-semibold">{step.screenCode}</span>
                </div>

                <div className="font-bold text-xs text-stone-900 line-clamp-1">{step.screenName}</div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-medium">{step.role}</div>

                <p className="text-[11px] text-stone-600 mt-2 leading-tight line-clamp-3">
                  {step.userAction}
                </p>

                {step.dataContract && (
                  <div className="mt-3 pt-2 border-t border-stone-200/80 font-mono text-[9.5px] text-[#132e4f] truncate">
                    {step.dataContract}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Deep Dive on Currently Selected Step */}
        {(() => {
          const activeStepData = currentFlow.steps[interactiveStep - 1];
          if (!activeStepData) return null;

          return (
            <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#132e4f] uppercase tracking-wider font-mono">
                  Step {activeStepData.stepNumber} Specification Deep Dive
                </span>
                <span className="text-[11px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {activeStepData.screenCode} · {activeStepData.screenName}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                  <div className="font-bold text-stone-900 mb-1 text-xs">User Interaction (Trigger)</div>
                  <p className="text-stone-600 leading-relaxed">{activeStepData.userAction}</p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                  <div className="font-bold text-stone-900 mb-1 text-xs">System State Mutation (Outcome)</div>
                  <p className="text-stone-600 leading-relaxed">{activeStepData.systemResponse}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ============================================================ */}
      {/* 2. RESPONSIVE VIEWPORT BREAKDOWN */}
      {/* ============================================================ */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900 font-display">
              Responsive Layout Adaptation Specifications
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Preserve layout integrity across desktop, tablet, and mobile screens without redesigning the UI.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-xl">
            {[
              { id: 'desktop', label: 'Desktop (≥1024px)', icon: Monitor },
              { id: 'tablet', label: 'Tablet (768-1023px)', icon: Tablet },
              { id: 'mobile', label: 'Mobile (<768px)', icon: Smartphone }
            ].map((b) => {
              const Icon = b.icon;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBreakpoint(b.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                    activeBreakpoint === b.id
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Breakpoint Details Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center space-x-2 text-stone-900 font-bold text-xs">
              <Monitor className="w-4 h-4 text-[#132e4f]" />
              <span>Desktop Layout (1024px to 1440px+)</span>
            </div>
            <ul className="text-[11px] text-stone-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Persistent 64px left sidebar with expandable role labels.</li>
              <li>Bento grid layout for executive KPIs (4 columns side-by-side).</li>
              <li>Multi-column tables render all fields with direct action buttons.</li>
              <li>GIS Laguna map and alert docket render in a 65% / 35% horizontal split.</li>
            </ul>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center space-x-2 text-stone-900 font-bold text-xs">
              <Tablet className="w-4 h-4 text-[#132e4f]" />
              <span>Tablet PWA Layout (768px to 1023px)</span>
            </div>
            <ul className="text-[11px] text-stone-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Optimized for on-site Municipal Link field evaluations.</li>
              <li>Sidebar collapses to top icon bar or expandable hamburger sheet.</li>
              <li>Forms transition to step-by-step touch stepper (44px min touch target).</li>
              <li>Tables support horizontal touch scroll with sticky Household ID column.</li>
            </ul>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center space-x-2 text-stone-900 font-bold text-xs">
              <Smartphone className="w-4 h-4 text-[#132e4f]" />
              <span>Mobile Adaptation (&lt;768px)</span>
            </div>
            <ul className="text-[11px] text-stone-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>All multi-column layouts stack vertically into single-column containers.</li>
              <li>Tables transform into responsive cards with expand/collapse details.</li>
              <li>Modals become bottom flyout sheets with sticky primary action buttons.</li>
              <li>Offline sync drawer expands to full viewport height.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SYSTEM STATES SPECIFICATION */}
      {/* ============================================================ */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <h2 className="text-xl font-bold text-stone-900 font-display">
          System State Handling Matrix
        </h2>
        <p className="text-xs text-stone-500">
          Frontend developers must implement these 4 standard system states for every screen:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. Normal State</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Active data loaded; all interactive buttons, filters, and action handlers fully operational.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="font-bold text-blue-800 mb-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>2. Loading / Skeleton</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Content shapes render pulsing skeleton rects (bg-stone-200/70 animate-pulse). Avoid blocking full-page spinners.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-stone-500" />
              <span>3. Empty State</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Displays clear descriptive text with an actionable button (e.g., "Clear Filters" or "Dispatch Task").
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>4. Offline / Error State</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              If GovCloud is unreachable, fallback to browser IndexedDB cache with visible offline banner.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
