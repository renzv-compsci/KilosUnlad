import React, { useState } from 'react';
import { 
  Code2, 
  Layers, 
  Users, 
  MousePointerClick, 
  Table as TableIcon, 
  FileText, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Smartphone,
  Monitor,
  Layout,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export interface ScreenSpecData {
  screenId: string;
  screenCode: string;
  screenName: string;
  chapter: '02 — Admin' | '03 — Case Worker Persona 1' | '04 — Case Worker Persona 2' | '05 — Case Worker Persona 3 / COA Auditor' | '01 — Design System' | '06 — User Flows';
  persona: string;
  roleTitle: string;
  purpose: string;
  endpoint?: string;
  contractFile?: string;
  navigation: {
    sidebarActive: string;
    breadcrumbs: string[];
    allowedRoles: string[];
  };
  layout: {
    containerType: 'Fluid Container' | 'Fixed Max-W 7xl' | 'Tablet PWA Shell';
    padding: string;
    gridStructure: string;
    breakpoints: string;
  };
  components: Array<{
    id: string;
    name: string;
    type: 'Card' | 'Table' | 'Form' | 'Header' | 'Modal' | 'Badge' | 'Navigation' | 'StatTile';
    description: string;
  }>;
  actions: Array<{
    trigger: string;
    target: string;
    type: 'Navigation' | 'Modal Open' | 'API Call' | 'State Mutation' | 'Offline Cache';
    description: string;
  }>;
  formsAndInputs?: Array<{
    field: string;
    type: string;
    required: boolean;
    validation: string;
    description: string;
  }>;
  tableSpecs?: Array<{
    tableName: string;
    columns: Array<{ name: string; type: string; sortable: boolean }>;
    rowActions: string[];
    pagination: string;
  }>;
  modalsAndDrawers?: Array<{
    name: string;
    trigger: string;
    dismissal: string;
    primaryAction: string;
  }>;
  states: {
    normal: string;
    loading: string;
    empty: string;
    error: string;
    offline?: string;
  };
  developerNotes: string[];
}

interface DeveloperScreenSpecCardProps {
  spec: ScreenSpecData;
  onNavigateToScreen?: (screenId: string) => void;
}

export const DeveloperScreenSpecCard: React.FC<DeveloperScreenSpecCardProps> = ({
  spec,
  onNavigateToScreen
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'actions' | 'data' | 'states'>('overview');
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden mb-6">
      {/* Top Banner: Screen Identifier & Chapter */}
      <div className="bg-[#132e4f] text-stone-100 p-5 sm:p-6 border-b border-[#1c3a5e]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-amber-400 text-stone-900 font-mono text-xs font-bold shadow-2xs">
              {spec.screenCode}
            </span>
            <span className="text-stone-300 font-mono text-xs">
              {spec.chapter}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              title="Copy JSON Specification"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Spec' : 'Copy Spec JSON'}</span>
            </button>
            {spec.contractFile && (
              <span className="text-[11px] font-mono text-amber-200/80 bg-white/5 px-2.5 py-1 rounded border border-white/10 hidden md:inline">
                {spec.contractFile}
              </span>
            )}
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-3">
          {spec.screenName}
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
          {spec.purpose}
        </p>

        {/* Persona Pill & Target Endpoint */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-md text-stone-200">
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-medium">Persona:</span>
            <span className="text-white font-semibold">{spec.persona}</span>
            <span className="text-stone-400">({spec.roleTitle})</span>
          </div>

          {spec.endpoint && (
            <div className="flex items-center space-x-1.5 bg-black/25 px-2.5 py-1 rounded-md text-emerald-300 font-mono text-[11px]">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{spec.endpoint}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs for Developer Spec */}
      <div className="flex border-b border-stone-200 bg-stone-50/80 px-4 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#132e4f] text-[#132e4f]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          1. Architecture & Layout
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'components'
              ? 'border-[#132e4f] text-[#132e4f]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          2. Components ({spec.components.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'actions'
              ? 'border-[#132e4f] text-[#132e4f]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          3. Interactions & Actions ({spec.actions.length})
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'data'
              ? 'border-[#132e4f] text-[#132e4f]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          4. Forms, Tables & Modals
        </button>
        <button
          onClick={() => setActiveTab('states')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'states'
              ? 'border-[#132e4f] text-[#132e4f]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          5. States & Dev Notes
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="p-5 sm:p-6 text-xs text-stone-700">
        
        {/* 1. OVERVIEW & LAYOUT */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-[#132e4f]" />
                  <span>Navigation Hierarchy</span>
                </h4>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-2">
                  <div className="flex items-center text-stone-500">
                    <span className="w-28 shrink-0 font-medium">Breadcrumb:</span>
                    <span className="font-mono text-stone-900 font-semibold">{spec.navigation.breadcrumbs.join('  ›  ')}</span>
                  </div>
                  <div className="flex items-center text-stone-500">
                    <span className="w-28 shrink-0 font-medium">Active Sidebar:</span>
                    <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-mono text-[11px] font-semibold">
                      {spec.navigation.sidebarActive}
                    </span>
                  </div>
                  <div className="flex items-center text-stone-500">
                    <span className="w-28 shrink-0 font-medium">RBAC Roles:</span>
                    <div className="flex gap-1 flex-wrap">
                      {spec.navigation.allowedRoles.map((role) => (
                        <span key={role} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px]">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#132e4f]" />
                  <span>Layout & Container Specifications</span>
                </h4>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Container Type:</span>
                    <span className="font-bold text-stone-900">{spec.layout.containerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Outer Padding:</span>
                    <span className="text-stone-900">{spec.layout.padding}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Grid Structure:</span>
                    <span className="text-stone-900">{spec.layout.gridStructure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Breakpoints:</span>
                    <span className="text-stone-900">{spec.layout.breakpoints}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Screen Intent & Frontend Checklist</span>
              </h4>
              <ul className="space-y-2 text-stone-600">
                <li className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Preserve strict typography hierarchy: Font display headings paired with high-legibility body styles.</span>
                </li>
                <li className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>No unrequested features or secondary routes: Strictly confine controls to documented actions.</span>
                </li>
                <li className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Pass WCAG AA color contrast ratios across all buttons, badges, and table cells.</span>
                </li>
                <li className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Ensure mobile touch targets are at least 44px by 44px on tablet/phone viewports.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. REUSABLE COMPONENTS */}
        {activeTab === 'components' && (
          <div className="space-y-3">
            <div className="text-[11px] text-stone-500 mb-2">
              The following design system components are mounted on this screen:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {spec.components.map((comp) => (
                <div key={comp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 hover:border-stone-300 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-900 font-mono text-[11px]">{comp.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200/80 text-stone-700">
                      {comp.type}
                    </span>
                  </div>
                  <div className="font-semibold text-stone-800 text-xs">{comp.name}</div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{comp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. INTERACTIONS & ACTIONS */}
        {activeTab === 'actions' && (
          <div className="space-y-3">
            <div className="text-[11px] text-stone-500 mb-2">
              Documented user interactions, button click handlers, and state transitions:
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-mono text-[10px] uppercase border-b border-stone-200">
                    <th className="p-2.5">User Trigger</th>
                    <th className="p-2.5">Action Type</th>
                    <th className="p-2.5">Target / State</th>
                    <th className="p-2.5">Outcome Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80 text-[11px]">
                  {spec.actions.map((act, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="p-2.5 font-semibold text-stone-900">{act.trigger}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-800 border border-blue-200">
                          {act.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-stone-600">{act.target}</td>
                      <td className="p-2.5 text-stone-600">{act.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. FORMS, TABLES & MODALS */}
        {activeTab === 'data' && (
          <div className="space-y-5">
            {spec.formsAndInputs && spec.formsAndInputs.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#132e4f]" />
                  <span>Form Inputs & Validation Schemas</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {spec.formsAndInputs.map((f, i) => (
                    <div key={i} className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-stone-900">{f.field}</span>
                        <span className="text-stone-500">{f.type} · {f.required ? 'Required' : 'Optional'}</span>
                      </div>
                      <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block border border-amber-200">
                        Rule: {f.validation}
                      </div>
                      <div className="text-[11px] text-stone-600 mt-1">{f.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {spec.tableSpecs && spec.tableSpecs.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-[#132e4f]" />
                  <span>Data Tables</span>
                </h4>
                {spec.tableSpecs.map((t, i) => (
                  <div key={i} className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 mb-3">
                    <div className="font-bold text-stone-900 text-xs mb-1">{t.tableName}</div>
                    <div className="text-[11px] text-stone-500 mb-2">Pagination: {t.pagination} | Row Actions: {t.rowActions.join(', ')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.columns.map((c, ci) => (
                        <span key={ci} className="bg-white px-2 py-0.5 rounded border border-stone-200 text-[10px] font-mono text-stone-700">
                          {c.name} ({c.type}) {c.sortable ? '↕' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {spec.modalsAndDrawers && spec.modalsAndDrawers.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#132e4f]" />
                  <span>Modals & Dialog Windows</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {spec.modalsAndDrawers.map((m, i) => (
                    <div key={i} className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                      <div className="font-bold text-stone-900 text-xs">{m.name}</div>
                      <div className="text-[11px] text-stone-600 mt-1">Trigger: <span className="font-mono">{m.trigger}</span></div>
                      <div className="text-[11px] text-stone-600">Dismissal: <span className="font-mono">{m.dismissal}</span></div>
                      <div className="text-[11px] text-stone-600">Primary: <span className="font-semibold text-emerald-800">{m.primaryAction}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. STATES & DEV NOTES */}
        {activeTab === 'states' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-bold text-emerald-800 text-xs mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Normal State</span>
                </div>
                <p className="text-[11px] text-stone-600">{spec.states.normal}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-bold text-blue-800 text-xs mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Loading State</span>
                </div>
                <p className="text-[11px] text-stone-600">{spec.states.loading}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-bold text-stone-700 text-xs mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
                  <span>Empty State</span>
                </div>
                <p className="text-[11px] text-stone-600">{spec.states.empty}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-bold text-rose-800 text-xs mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Error State</span>
                </div>
                <p className="text-[11px] text-stone-600">{spec.states.error}</p>
              </div>
            </div>

            {spec.states.offline && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs">
                <span className="font-bold">Offline PWA Behavior: </span>
                <span>{spec.states.offline}</span>
              </div>
            )}

            <div>
              <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2">
                Implementation Notes for Frontend Developer
              </h4>
              <ul className="space-y-1.5 list-disc pl-4 text-stone-600">
                {spec.developerNotes.map((note, i) => (
                  <li key={i} className="leading-relaxed">{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
