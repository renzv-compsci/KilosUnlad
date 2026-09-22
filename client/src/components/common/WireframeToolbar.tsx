import React from 'react';
import { 
  Laptop, 
  Tablet, 
  Smartphone,
  Code2, 
  Layers, 
  Eye, 
  FileJson, 
  HelpCircle,
  Sparkles,
  Wifi,
  WifiOff,
  Split,
  FileText,
  Sliders,
  CheckCircle2,
  Bookmark
} from 'lucide-react';

export type ScreenId = 
  // 01 — Design System
  | 'design_system'
  // General / Auth
  | 'login' 
  // 02 — Admin (Regional Director)
  | 'dashboard' 
  | 'triage' 
  | 'dispatch_manager'
  | 'dispatch_modal' 
  | 'admin_settings'
  // 03 — Case Worker Persona 1 (Municipal Link)
  | 'field_dashboard'
  | 'field_tasks' 
  | 'field_verify' 
  | 'field_sync'
  // 04 — Case Worker Persona 2 (Grievance Officer)
  | 'grievance_dashboard'
  | 'due_process'
  | 'appeal_hearing'
  // 05 — Case Worker Persona 3 / COA Auditor (COA Auditor)
  | 'coa_dashboard'
  | 'audit_ledger'
  | 'coa_sampling'
  // 06 — User Flows
  | 'user_flows';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type RenderFidelity = 'full' | 'wireframe';
export type ViewMode = 'live_ui' | 'spec_sheet' | 'split_view';

export type HandoffChapter = 
  | '01 — Design System'
  | '02 — Admin'
  | '03 — Case Worker Persona 1'
  | '04 — Case Worker Persona 2'
  | '05 — Case Worker Persona 3 / COA Auditor'
  | '06 — User Flows';

interface WireframeToolbarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  deviceMode: DeviceMode;
  onToggleDeviceMode: (mode: DeviceMode) => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  fidelity: RenderFidelity;
  onToggleFidelity: (fidelity: RenderFidelity) => void;
  showSpecAnnotations: boolean;
  onToggleSpecAnnotations: () => void;
  onOpenContractDrawer: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export const SCREEN_CONFIGS: Record<ScreenId, { 
  title: string; 
  number: string; 
  chapter: HandoffChapter;
  device: DeviceMode; 
  contract: string;
  endpoint?: string;
}> = {
  design_system: {
    number: 'SYS-01',
    title: 'Design Tokens & UI Component Library',
    chapter: '01 — Design System',
    device: 'desktop',
    contract: 'design-tokens.json'
  },
  login: { 
    number: 'SCR-01', 
    title: 'Auth & Session Gate', 
    chapter: '06 — User Flows',
    device: 'desktop', 
    contract: 'auth-session.json',
    endpoint: 'POST /api/v1/auth/login'
  },
  dashboard: { 
    number: 'ADM-01', 
    title: 'Executive Regional Dashboard & GIS', 
    chapter: '02 — Admin',
    device: 'desktop', 
    contract: 'admin-triage-feed.json',
    endpoint: 'GET /api/v1/dashboard/summary'
  },
  triage: { 
    number: 'ADM-02', 
    title: 'Triage Queue & Flagged Cases', 
    chapter: '02 — Admin',
    device: 'desktop', 
    contract: 'admin-triage-feed.json',
    endpoint: 'GET /api/v1/beneficiaries/triage-queue'
  },
  dispatch_manager: {
    number: 'ADM-03',
    title: 'Caseworker Operations & Dispatch',
    chapter: '02 — Admin',
    device: 'desktop',
    contract: 'admin-task-dispatch.json',
    endpoint: 'GET /api/v1/tasks/operations'
  },
  dispatch_modal: { 
    number: 'ADM-04', 
    title: 'Task Dispatch Dialog Modal', 
    chapter: '02 — Admin',
    device: 'desktop', 
    contract: 'admin-task-dispatch.json',
    endpoint: 'POST /api/v1/tasks/dispatch'
  },
  admin_settings: {
    number: 'ADM-05',
    title: 'Policy Thresholds & Algorithm Settings',
    chapter: '02 — Admin',
    device: 'desktop',
    contract: 'admin-policy-settings.json',
    endpoint: 'GET /api/v1/admin/settings'
  },
  field_dashboard: {
    number: 'ML-01',
    title: 'Caseworker Operational Hub',
    chapter: '03 — Case Worker Persona 1',
    device: 'tablet',
    contract: 'field-task-download.json',
    endpoint: 'GET /api/v1/field/caseworker-hub'
  },
  field_tasks: { 
    number: 'ML-02', 
    title: 'Assigned Field Tasks (PWA)', 
    chapter: '03 — Case Worker Persona 1',
    device: 'tablet', 
    contract: 'field-task-download.json',
    endpoint: 'GET /api/v1/field/tasks'
  },
  field_verify: { 
    number: 'ML-03', 
    title: '5-Step Field Assessment Form', 
    chapter: '03 — Case Worker Persona 1',
    device: 'tablet', 
    contract: 'field-task-submission.json',
    endpoint: 'POST /api/v1/tasks/:id/submit'
  },
  field_sync: { 
    number: 'ML-04', 
    title: 'Offline Cache & Sync Drawer', 
    chapter: '03 — Case Worker Persona 1',
    device: 'tablet', 
    contract: 'field-sync-queue.json',
    endpoint: 'POST /api/v1/sync/batch'
  },
  grievance_dashboard: {
    number: 'GPO-01',
    title: 'Grievance & Appeals Operational Hub',
    chapter: '04 — Case Worker Persona 2',
    device: 'desktop',
    contract: 'admin-due-process.json',
    endpoint: 'GET /api/v1/due-process/appeals/summary'
  },
  due_process: { 
    number: 'GPO-02', 
    title: '15-Day Statutory Due Process Docket', 
    chapter: '04 — Case Worker Persona 2',
    device: 'desktop', 
    contract: 'admin-due-process.json',
    endpoint: 'GET /api/v1/due-process/notices'
  },
  appeal_hearing: {
    number: 'GPO-03',
    title: 'Evidentiary Hearing Registration Dialog',
    chapter: '04 — Case Worker Persona 2',
    device: 'desktop',
    contract: 'admin-due-process.json',
    endpoint: 'POST /api/v1/due-process/appeals/schedule'
  },
  coa_dashboard: {
    number: 'COA-01',
    title: 'State Auditor Oversight Dashboard',
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    device: 'desktop',
    contract: 'coa-audit-overview.json',
    endpoint: 'GET /api/v1/audit/dashboard'
  },
  audit_ledger: { 
    number: 'COA-02', 
    title: 'COA Cryptographic Merkle Chain Inspector', 
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    device: 'desktop', 
    contract: 'audit-chain-verification.json',
    endpoint: 'GET /api/v1/audit/verify-chain'
  },
  coa_sampling: {
    number: 'COA-03',
    title: 'Evidentiary Sampling Reconciliation',
    chapter: '05 — Case Worker Persona 3 / COA Auditor',
    device: 'desktop', 
    contract: 'coa-sampling-ledger.json',
    endpoint: 'GET /api/v1/audit/sampling'
  },
  user_flows: {
    number: 'FLOW-01',
    title: 'User Flows & Responsive Viewport Specs',
    chapter: '06 — User Flows',
    device: 'desktop',
    contract: 'interaction-flows.json'
  }
};

export const WireframeToolbar: React.FC<WireframeToolbarProps> = ({
  currentScreen,
  onSelectScreen,
  deviceMode,
  onToggleDeviceMode,
  viewMode,
  onToggleViewMode,
  fidelity,
  onToggleFidelity,
  showSpecAnnotations,
  onToggleSpecAnnotations,
  onOpenContractDrawer,
  isOffline,
  onToggleOffline
}) => {
  const currentConfig = SCREEN_CONFIGS[currentScreen] || SCREEN_CONFIGS.dashboard;

  const chapters: Array<{ id: HandoffChapter; label: string; defaultScreen: ScreenId }> = [
    { id: '01 — Design System', label: '01 — Design System', defaultScreen: 'design_system' },
    { id: '02 — Admin', label: '02 — Admin', defaultScreen: 'dashboard' },
    { id: '03 — Case Worker Persona 1', label: '03 — Case Worker 1 (Field)', defaultScreen: 'field_dashboard' },
    { id: '04 — Case Worker Persona 2', label: '04 — Case Worker 2 (Appeals)', defaultScreen: 'grievance_dashboard' },
    { id: '05 — Case Worker Persona 3 / COA Auditor', label: '05 — Case Worker 3 (COA)', defaultScreen: 'coa_dashboard' },
    { id: '06 — User Flows', label: '06 — User Flows', defaultScreen: 'user_flows' }
  ];

  return (
    <div className="bg-[#0c1f36] text-stone-200 border-b border-[#1b3a5e] sticky top-0 z-50 text-xs shadow-md">
      
      {/* Top Bar: Developer Handoff Chapters */}
      <div className="border-b border-white/10 bg-[#081729]/70 px-3 sm:px-4 py-1.5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="font-display font-bold text-white text-xs tracking-tight">
              Figma Handoff Specification
            </span>
            <span className="text-[10px] font-mono text-stone-400 hidden lg:inline">
              Developer-Ready Reference
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {chapters.map((ch) => {
              const isActive = currentConfig.chapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectScreen(ch.defaultScreen)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-400 text-stone-900 font-bold shadow-2xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lower Bar: Active Screen Selector, View Mode, Device Viewport & Tools */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Screen Code & Selector */}
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[11px] font-bold border border-white/10">
            {currentConfig.number}
          </span>

          <select
            id="wireframe-screen-selector"
            value={currentScreen}
            onChange={(e) => {
              const scr = e.target.value as ScreenId;
              onSelectScreen(scr);
              if (SCREEN_CONFIGS[scr].device === 'tablet' && deviceMode === 'desktop') {
                onToggleDeviceMode('tablet');
              } else if (SCREEN_CONFIGS[scr].device === 'desktop' && deviceMode === 'tablet') {
                onToggleDeviceMode('desktop');
              }
            }}
            className="bg-[#17375d] hover:bg-[#1c4370] text-stone-100 border border-[#244c7c] rounded-md px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 transition cursor-pointer max-w-[280px] sm:max-w-none truncate"
          >
            <optgroup label="01 — Design System">
              <option value="design_system">SYS-01: Design Tokens & Component Library</option>
            </optgroup>
            <optgroup label="02 — Admin (Regional Director)">
              <option value="dashboard">ADM-01: Executive Regional Dashboard & GIS</option>
              <option value="triage">ADM-02: Triage Queue & Flagged Cases</option>
              <option value="dispatch_manager">ADM-03: Caseworker Operations & Dispatch</option>
              <option value="dispatch_modal">ADM-04: Task Dispatch Dialog Modal</option>
              <option value="admin_settings">ADM-05: Policy Thresholds & Algorithm Settings</option>
            </optgroup>
            <optgroup label="03 — Case Worker Persona 1 (Municipal Link)">
              <option value="field_dashboard">ML-01: Caseworker Operational Hub</option>
              <option value="field_tasks">ML-02: Assigned Field Tasks (PWA)</option>
              <option value="field_verify">ML-03: 5-Step Field Assessment Form</option>
              <option value="field_sync">ML-04: Offline Cache & Sync Drawer</option>
            </optgroup>
            <optgroup label="04 — Case Worker Persona 2 (Grievance Officer)">
              <option value="grievance_dashboard">GPO-01: Grievance & Appeals Operational Hub</option>
              <option value="due_process">GPO-02: 15-Day Statutory Due Process Docket</option>
              <option value="appeal_hearing">GPO-03: Evidentiary Hearing Registration Dialog</option>
            </optgroup>
            <optgroup label="05 — Case Worker Persona 3 / COA Auditor">
              <option value="coa_dashboard">COA-01: State Auditor Oversight Dashboard</option>
              <option value="audit_ledger">COA-02: Cryptographic Merkle Chain Inspector</option>
              <option value="coa_sampling">COA-03: Evidentiary Sampling Reconciliation</option>
            </optgroup>
            <optgroup label="06 — User Flows">
              <option value="user_flows">FLOW-01: Interaction Flows & Responsive Specs</option>
              <option value="login">SCR-01: Auth & Session Gate</option>
            </optgroup>
          </select>
        </div>

        {/* Center / Right Controls: View Mode Switcher */}
        <div className="flex items-center space-x-2">
          
          {/* View Mode: Live UI vs Figma Dev Spec vs Split */}
          <div className="flex items-center bg-[#17375d] p-0.5 rounded-lg border border-[#244c7c]">
            <button
              onClick={() => onToggleViewMode('live_ui')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer ${
                viewMode === 'live_ui'
                  ? 'bg-amber-400 text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
              title="View live interactive UI screen"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live UI</span>
            </button>

            <button
              onClick={() => onToggleViewMode('spec_sheet')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer ${
                viewMode === 'spec_sheet'
                  ? 'bg-amber-400 text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
              title="View developer technical specification sheet"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dev Spec</span>
            </button>

            <button
              onClick={() => onToggleViewMode('split_view')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer ${
                viewMode === 'split_view'
                  ? 'bg-amber-400 text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
              title="View both Live UI and Spec side-by-side"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          {/* Viewport Width Switcher */}
          <div className="flex items-center bg-[#17375d] p-0.5 rounded-lg border border-[#244c7c]">
            <button
              onClick={() => onToggleDeviceMode('desktop')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceMode === 'desktop'
                  ? 'bg-[#0c2340] text-amber-300'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Desktop View (1440px)"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggleDeviceMode('tablet')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceMode === 'tablet'
                  ? 'bg-[#0c2340] text-amber-300'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Tablet PWA View (768px - 1024px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggleDeviceMode('mobile')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceMode === 'mobile'
                  ? 'bg-[#0c2340] text-amber-300'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Annotations Toggle */}
          <button
            onClick={onToggleSpecAnnotations}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center space-x-1 transition cursor-pointer ${
              showSpecAnnotations
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-[#17375d] text-stone-300 border-[#244c7c] hover:text-white'
            }`}
            title="Toggle component specification callout pins"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Annotations</span>
          </button>

          {/* Wireframe / Hi-Fi Toggle */}
          <button
            onClick={() => onToggleFidelity(fidelity === 'full' ? 'wireframe' : 'full')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center space-x-1 transition cursor-pointer ${
              fidelity === 'wireframe'
                ? 'bg-amber-400 text-stone-900 font-bold border-amber-400'
                : 'bg-[#17375d] text-stone-300 border-[#244c7c] hover:text-white'
            }`}
            title="Toggle Wireframe Blueprint Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{fidelity === 'full' ? 'Hi-Fi' : 'Wireframe'}</span>
          </button>

          {/* Contract JSON Inspector Modal Trigger */}
          <button
            onClick={onOpenContractDrawer}
            className="px-2.5 py-1 bg-[#17375d] hover:bg-[#1c4370] text-amber-300 border border-[#244c7c] rounded-md text-[11px] font-mono flex items-center space-x-1 transition cursor-pointer"
            title="Inspect Data Contract JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">JSON Contract</span>
          </button>
        </div>

      </div>

    </div>
  );
};
