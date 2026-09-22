import React, { useState } from 'react';
import { ScreenId } from '../common/WireframeToolbar';
import { 
  Users, 
  AlertOctagon, 
  Send, 
  Award, 
  AlertTriangle, 
  MapPin, 
  Info, 
  ExternalLink,
  ShieldCheck,
  Compass,
  Layers,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  Bike,
  CreditCard,
  Building,
  UserCheck,
  BarChart3,
  SlidersHorizontal,
  ArrowRight,
  Eye
} from 'lucide-react';
import { MinimalPhMap, ClusterPin } from '../dashboard/MinimalPhMap';

interface Screen2DashboardProps {
  onNavigateToScreen: (screen: ScreenId) => void;
  showSpecAnnotations?: boolean;
}

export type MetricVisualType = 'active_beneficiaries' | 'flagged_review' | 'dispatched_tasks' | 'graduated_cycle';

export const Screen2Dashboard: React.FC<Screen2DashboardProps> = ({
  onNavigateToScreen,
  showSpecAnnotations = false,
}) => {
  // Metric counts from admin-triage-feed.json
  const metrics = {
    active_beneficiaries: 4850,
    high_risk_count: 32, // S_i >= 70
    under_investigation_count: 12,
    notice_of_ineligibility_count: 4, // Graduated this cycle
  };

  // State to track which card's visual representation is actively displayed
  const [activeVisualMetric, setActiveVisualMetric] = useState<MetricVisualType>('flagged_review');

  // State to toggle between Map view and Comparative Municipal Risk Matrix
  const [geoViewMode, setGeoViewMode] = useState<'map' | 'matrix'>('map');

  // Laguna Map Coordinates and Pin Data [lon, lat]
  const [selectedCluster, setSelectedCluster] = useState<string | null>('Calamba City');

  const lagunaPins: ClusterPin[] = [
    {
      id: 'pin-1',
      municipality: 'Calamba City',
      coordinates: [121.1652, 14.2144],
      status: 'RED',
      riskScore: 84.0,
      flaggedCount: 14,
      dispatchedCount: 6,
      note: 'Meralco lifeline exceedances & vehicle cross-matches along Real & Canlubang',
      calamityActive: true
    },
    {
      id: 'pin-2',
      municipality: 'Santa Rosa',
      coordinates: [121.1180, 14.3160],
      status: 'AMBER',
      riskScore: 72.5,
      flaggedCount: 8,
      dispatchedCount: 3,
      note: 'Industrial PEZA corridor employment reports under verification',
      calamityActive: false
    },
    {
      id: 'pin-3',
      municipality: 'San Pedro',
      coordinates: [121.0583, 14.3610],
      status: 'RED',
      riskScore: 78.2,
      flaggedCount: 6,
      dispatchedCount: 2,
      note: 'Commercial stall titles matching PhilSys registered spouse',
      calamityActive: false
    },
    {
      id: 'pin-4',
      municipality: 'Los Baños',
      coordinates: [121.2435, 14.1706],
      status: 'AMBER',
      riskScore: 52.0,
      flaggedCount: 3,
      dispatchedCount: 1,
      note: 'Pawning ATM inquiry (Sangla-ATM hotlines)',
      calamityActive: false
    },
    {
      id: 'pin-5',
      municipality: 'Biñan City',
      coordinates: [121.0834, 14.3385],
      status: 'GREEN',
      riskScore: 22.0,
      flaggedCount: 1,
      dispatchedCount: 0,
      note: '100% compliant sample; recent SWDI baseline confirmed',
      calamityActive: false
    }
  ];

  // Specific domain breakdown metrics for each municipality in the Laguna cluster
  const MUNICIPALITY_METRICS: Record<string, {
    riskScore: number;
    discrepancies: { label: string; count: number; pct: number; color: string; icon: string }[];
    assignedWorker: string;
    fieldCoveragePct: number;
    swdiBreakdown: string;
  }> = {
    'Calamba City': {
      riskScore: 84.0,
      discrepancies: [
        { label: 'Meralco Lifeline Breach (>200 kWh)', count: 7, pct: 50, color: 'bg-rose-600', icon: 'zap' },
        { label: 'LTO Registered Vehicle Match', count: 4, pct: 29, color: 'bg-amber-600', icon: 'bike' },
        { label: 'Sangla-ATM Loan Sharking', count: 3, pct: 21, color: 'bg-[#132e4f]', icon: 'card' },
      ],
      assignedWorker: 'Maria Santos (Municipal Link #ML-04)',
      fieldCoveragePct: 43,
      swdiBreakdown: '9 Survival (L1) · 5 Subsistence (L2)'
    },
    'Santa Rosa': {
      riskScore: 72.5,
      discrepancies: [
        { label: 'Meralco Lifeline Breach (>200 kWh)', count: 4, pct: 50, color: 'bg-rose-600', icon: 'zap' },
        { label: 'LTO Registered Vehicle Match', count: 3, pct: 38, color: 'bg-amber-600', icon: 'bike' },
        { label: 'SWDI Tier Inversion', count: 1, pct: 12, color: 'bg-rose-600', icon: 'trend' },
      ],
      assignedWorker: 'Juan Reyes (Municipal Link #ML-07)',
      fieldCoveragePct: 38,
      swdiBreakdown: '5 Survival (L1) · 3 Subsistence (L2)'
    },
    'San Pedro': {
      riskScore: 78.2,
      discrepancies: [
        { label: 'Commercial Real Estate Titles', count: 3, pct: 50, color: 'bg-rose-600', icon: 'building' },
        { label: 'Meralco Lifeline Breach (>200 kWh)', count: 2, pct: 33, color: 'bg-amber-600', icon: 'zap' },
        { label: 'LTO Registered Motorcycle Match', count: 1, pct: 17, color: 'bg-amber-600', icon: 'bike' },
      ],
      assignedWorker: 'Elena Diaz (Municipal Link #ML-02)',
      fieldCoveragePct: 33,
      swdiBreakdown: '4 Survival (L1) · 2 Subsistence (L2)'
    },
    'Los Baños': {
      riskScore: 52.0,
      discrepancies: [
        { label: 'Sangla-ATM Pawn Hotline Report', count: 2, pct: 67, color: 'bg-amber-600', icon: 'card' },
        { label: 'Meralco Lifeline Exceedance', count: 1, pct: 33, color: 'bg-amber-600', icon: 'zap' },
      ],
      assignedWorker: 'Ramon Bautista (Municipal Link #ML-11)',
      fieldCoveragePct: 33,
      swdiBreakdown: '3 Survival (L1)'
    },
    'Biñan City': {
      riskScore: 22.0,
      discrepancies: [
        { label: 'Meralco Lifeline Baseline Inquiry', count: 1, pct: 100, color: 'bg-emerald-600', icon: 'zap' },
      ],
      assignedWorker: 'Grace Lim (Municipal Link #ML-09)',
      fieldCoveragePct: 0,
      swdiBreakdown: '1 Survival (L1)'
    }
  };

  const activePin = lagunaPins.find((p) => p.municipality === selectedCluster) || lagunaPins[0];
  const activeClusterDetails = MUNICIPALITY_METRICS[activePin.municipality] || MUNICIPALITY_METRICS['Calamba City'];

  return (
    <div className="p-5 sm:p-7 lg:p-8 space-y-7 max-w-7xl mx-auto">
      
      {/* Spec Annotation Header (Only shown when bindings toggled on) */}
      {showSpecAnnotations && (
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-[11px] font-mono text-slate-700 flex justify-between items-center">
          <div>
            <span className="font-semibold">Screen 2: Executive Dashboard & Regional Overview</span>
            <span className="ml-2 text-slate-500">Contract: admin-triage-feed.json</span>
          </div>
          <div>Centroid: [121.1652, 14.2144] Laguna Cluster</div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/90">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Casework Intelligence
            </span>
            <span className="text-stone-300">/</span>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
              Q3 2026 Active Cycle
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight font-display">
            Executive Caseload & Compliance
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Laguna Provincial Cluster — 4Ps Beneficiary Auditing & Field Verification Oversight
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="text-xs text-stone-600 bg-white border border-stone-200/90 px-3 py-1.5 rounded-lg shadow-2xs">
            Station: <strong className="text-stone-900 font-semibold">Region IV-A</strong>
          </span>
          <button
            onClick={() => onNavigateToScreen('triage')}
            className="px-4 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Open Triage Queue</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </button>
        </div>
      </div>

      {/* 1. Calamity Status Banner (RA 10121) */}
      <div 
        id="calamity-status-banner"
        className="bg-amber-50/80 border border-amber-200/90 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-100/80 text-amber-900 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-950">
                Statutory Moratorium Active (Republic Act No. 10121)
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded font-semibold border border-amber-300/60">
                Calamba City
              </span>
            </div>
            <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
              Involuntary graduation and benefit delisting are temporarily suspended in Calamba City through October 24, 2026 due to local storm recovery declaration. Statutory due process notices continue without disruption.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToScreen('due_process')}
          className="shrink-0 px-3 py-1.5 bg-white hover:bg-amber-100/80 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300/80 shadow-2xs transition cursor-pointer"
        >
          Review Appeals
        </button>
      </div>

      {/* 2. Top Metric Cards with Rich Visual Representations & Click-to-Visual Interactivity */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Operational Key Performance Indicators
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-[#132e4f]" />
            <span>Click any card below to direct to its focused analytical visual</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 1: Active Beneficiaries + Sparkline Area Chart */}
          <div 
            id="metric-active-beneficiaries"
            onClick={() => setActiveVisualMetric('active_beneficiaries')}
            className={`bg-white p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeVisualMetric === 'active_beneficiaries'
                ? 'ring-2 ring-[#132e4f] border-[#132e4f] shadow-md bg-stone-50/50'
                : 'border-stone-200/90 shadow-2xs hover:border-stone-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold text-stone-700">Active Beneficiaries</span>
                <Users className="w-4 h-4 text-stone-400" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight tabular-nums">
                  {metrics.active_beneficiaries.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                  +2.9% Trend
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Laguna Cluster — regular monitoring</span>
                {activeVisualMetric === 'active_beneficiaries' && (
                  <span className="text-[10px] font-semibold text-[#132e4f] bg-[#132e4f]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]" /> Visual Active
                  </span>
                )}
              </div>
            </div>

            {/* Visual Representation: Caseload Sparkline Trend */}
            <div className="mt-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                <span className="font-mono text-[10px]">6-Mo Trend (Jan–Jun)</span>
                <span className="text-emerald-700 font-semibold tabular-nums">99.2% Active</span>
              </div>
              <div className="h-9 w-full">
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0c3260" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0c3260" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 24 L 20 20 L 40 16 L 60 13 L 80 8 L 100 4 L 100 28 L 0 28 Z"
                    fill="url(#activeGradient)"
                  />
                  <path
                    d="M 0 24 L 20 20 L 40 16 L 60 13 L 80 8 L 100 4"
                    fill="none"
                    stroke="#132e4f"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="100" cy="4" r="2.5" fill="#0c2340" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Flagged for Review + Risk Breakdown Visualizer */}
          <div 
            id="metric-flagged-review"
            onClick={() => setActiveVisualMetric('flagged_review')}
            className={`bg-white p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeVisualMetric === 'flagged_review'
                ? 'ring-2 ring-[#132e4f] border-[#132e4f] shadow-md bg-stone-50/50'
                : 'border-stone-200/90 shadow-2xs hover:border-stone-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Flagged for Review</span>
                <AlertOctagon className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight tabular-nums">
                  {metrics.high_risk_count}
                </span>
                <span className="text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 px-1.5 py-0.5 rounded">
                  Risk Score ≥ 70
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Cross-match discrepancies</span>
                {activeVisualMetric === 'flagged_review' ? (
                  <span className="text-[10px] font-semibold text-[#132e4f] bg-[#132e4f]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]" /> Visual Active
                  </span>
                ) : (
                  <span className="text-stone-400 text-[10px]">Click to view visual</span>
                )}
              </div>
            </div>

            {/* Visual Representation: Segmented Risk Breakdown Bar */}
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>Trigger Distribution</span>
                <span className="text-rose-800 font-semibold tabular-nums">32 Cases</span>
              </div>
              {/* Segmented Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-100">
                <div style={{ width: '50%' }} className="bg-rose-600 h-full" title="Utility Overuse: 16 (50%)" />
                <div style={{ width: '34%' }} className="bg-amber-600 h-full" title="Vehicle Cross-match: 11 (34%)" />
                <div style={{ width: '16%' }} className="bg-[#132e4f] h-full" title="Sangla-ATM Loan Shark: 5 (16%)" />
              </div>
              {/* Mini Legend */}
              <div className="flex items-center justify-between text-[10px] text-stone-600 font-medium pt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  <span>16 Utility</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  <span>11 Vehicle</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]"></span>
                  <span>5 Sangla</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Investigations Dispatched + Pipeline Velocity Progress */}
          <div 
            id="metric-dispatched-tasks"
            onClick={() => setActiveVisualMetric('dispatched_tasks')}
            className={`bg-white p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeVisualMetric === 'dispatched_tasks'
                ? 'ring-2 ring-[#132e4f] border-[#132e4f] shadow-md bg-stone-50/50'
                : 'border-stone-200/90 shadow-2xs hover:border-stone-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Dispatched to Field</span>
                <Send className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-amber-900 tracking-tight tabular-nums">
                  {metrics.under_investigation_count}
                </span>
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded">
                  Active Verification
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Municipal Links assigned</span>
                {activeVisualMetric === 'dispatched_tasks' ? (
                  <span className="text-[10px] font-semibold text-[#132e4f] bg-[#132e4f]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]" /> Visual Active
                  </span>
                ) : (
                  <span className="text-stone-400 text-[10px]">Click to view visual</span>
                )}
              </div>
            </div>

            {/* Visual Representation: Field Pipeline Velocity */}
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>Verification Pipeline</span>
                <span className="text-amber-800 font-semibold tabular-nums">75% Active</span>
              </div>
              {/* Pipeline bar */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-100">
                <div style={{ width: '58%' }} className="bg-amber-600 h-full" title="7 In Field (58%)" />
                <div style={{ width: '25%' }} className="bg-[#132e4f] h-full" title="3 Evidence Uploaded (25%)" />
                <div style={{ width: '17%' }} className="bg-stone-300 h-full" title="2 Pending Visit (17%)" />
              </div>
              {/* Mini Legend */}
              <div className="flex items-center justify-between text-[10px] text-stone-600 font-medium pt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  <span>7 In Field</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]"></span>
                  <span>3 Uploaded</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                  <span>2 Queued</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Graduated This Cycle + Radial Quota Visualizer */}
          <div 
            id="metric-graduated-cycle"
            onClick={() => setActiveVisualMetric('graduated_cycle')}
            className={`bg-white p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeVisualMetric === 'graduated_cycle'
                ? 'ring-2 ring-[#132e4f] border-[#132e4f] shadow-md bg-stone-50/50'
                : 'border-stone-200/90 shadow-2xs hover:border-stone-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Graduated This Cycle</span>
                <Award className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-800 tracking-tight tabular-nums">
                  {metrics.notice_of_ineligibility_count}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                  Self-Sufficient (SWDI-3)
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Transition exits</span>
                {activeVisualMetric === 'graduated_cycle' ? (
                  <span className="text-[10px] font-semibold text-[#132e4f] bg-[#132e4f]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#132e4f]" /> Visual Active
                  </span>
                ) : (
                  <span className="text-stone-400 text-[10px]">Click to view visual</span>
                )}
              </div>
            </div>

            {/* Visual Representation: Target Completion Quota Ring & Progress */}
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] text-stone-500">Cycle Target</div>
                <div className="text-xs font-bold text-stone-800 tabular-nums">4 of 6 Exits</div>
                <div className="text-[10px] text-emerald-700 font-medium tabular-nums">67% of Q3 Target</div>
              </div>
              {/* Circular SVG Progress */}
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-stone-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-700"
                    strokeDasharray="67, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-emerald-800 tabular-nums">
                  67%
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DEDICATED VISUAL ANALYTICS DECK (Driven by clicked metric card above) */}
      <div 
        id="metric-visual-deck" 
        className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden transition-all duration-200"
      >
        {/* Visual Header with contextual mode indicator */}
        <div className="p-4 sm:p-5 border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-3 bg-stone-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#132e4f] text-white rounded-lg shadow-2xs">
              {activeVisualMetric === 'flagged_review' && <AlertOctagon className="w-4 h-4" />}
              {activeVisualMetric === 'dispatched_tasks' && <Send className="w-4 h-4" />}
              {activeVisualMetric === 'active_beneficiaries' && <Users className="w-4 h-4" />}
              {activeVisualMetric === 'graduated_cycle' && <Award className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Focused Visual Analytics
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-200/80 text-stone-700">
                  {activeVisualMetric === 'flagged_review' && 'Flagged for Review (32)'}
                  {activeVisualMetric === 'dispatched_tasks' && 'Dispatched to Field (12)'}
                  {activeVisualMetric === 'active_beneficiaries' && 'Active Beneficiaries (4,850)'}
                  {activeVisualMetric === 'graduated_cycle' && 'Graduated This Cycle (4)'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-display mt-0.5">
                {activeVisualMetric === 'flagged_review' && 'Cross-Match Discrepancy Matrix & Risk Severity Spectrum'}
                {activeVisualMetric === 'dispatched_tasks' && 'Field Operations Pipeline & Municipal Links Deployment Roster'}
                {activeVisualMetric === 'active_beneficiaries' && 'Laguna Provincial Caseload Baseline & Demographics Distribution'}
                {activeVisualMetric === 'graduated_cycle' && 'SWDI Level 3 Self-Sufficiency Exit Progress & Transition Quota'}
              </h3>
            </div>
          </div>

          {/* Quick Tab Selector for Visuals */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg border border-stone-200/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveVisualMetric('flagged_review')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                activeVisualMetric === 'flagged_review' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Flagged (32)
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualMetric('dispatched_tasks')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                activeVisualMetric === 'dispatched_tasks' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Field Dispatched (12)
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualMetric('active_beneficiaries')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                activeVisualMetric === 'active_beneficiaries' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Caseload (4,850)
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualMetric('graduated_cycle')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                activeVisualMetric === 'graduated_cycle' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Graduated (4)
            </button>
          </div>
        </div>

        {/* Dynamic Visual Content based on active card */}
        <div className="p-5 sm:p-6">
          
          {/* VISUAL 1: FLAGGED FOR REVIEW (32 Cases) */}
          {activeVisualMetric === 'flagged_review' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Visual Chart 1: Trigger Source Distribution */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Cross-Match Trigger Source</span>
                      <span className="text-[10px] text-stone-500 font-mono">32 Total Flags</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Cross-referenced against Meralco billing databases, LTO vehicle registrations, and Sangla-ATM hotlines.
                    </p>
                    
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-700 font-medium flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            Meralco Lifeline Breach (&gt;200 kWh)
                          </span>
                          <span className="font-mono font-bold text-stone-900">16 (50.0%)</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-rose-600 h-full rounded-full" style={{ width: '50%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-700 font-medium flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            LTO Vehicle Registration Match
                          </span>
                          <span className="font-mono font-bold text-stone-900">11 (34.4%)</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-600 h-full rounded-full" style={{ width: '34.4%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-700 font-medium flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#132e4f] shrink-0" />
                            Sangla-ATM Loan Sharking Reports
                          </span>
                          <span className="font-mono font-bold text-stone-900">5 (15.6%)</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#132e4f] h-full rounded-full" style={{ width: '15.6%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>Audit Threshold: 200 kWh/mo Lifeline Cap</span>
                    <span className="text-rose-700 font-semibold">100% Deterministic</span>
                  </div>
                </div>

                {/* Visual Chart 2: Composite Risk Severity Spectrum */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Risk Severity Score Spectrum</span>
                      <span className="text-[10px] text-stone-500 font-mono">Formula: S_i = Σ w_k x_ik</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                      Statutory weight matrix combining electricity consumption, asset registry, and SWDI tier inversion.
                    </p>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 text-xs font-bold font-mono text-rose-700">80–100</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-stone-700 mb-1">
                            <span>Critical Discrepancy</span>
                            <span className="font-semibold font-mono">14 Cases</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-rose-600 h-full rounded-full" style={{ width: '43.8%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 text-xs font-bold font-mono text-amber-700">70–79</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-stone-700 mb-1">
                            <span>High Priority Triage</span>
                            <span className="font-semibold font-mono">18 Cases</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-amber-600 h-full rounded-full" style={{ width: '56.2%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 text-xs font-bold font-mono text-emerald-700">&lt; 70</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-stone-700 mb-1">
                            <span>Under Threshold (Filtered Out)</span>
                            <span className="font-semibold font-mono">4,818 Normal</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '99.3%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>Statutory Flag Threshold: 70.0</span>
                    <span className="font-mono text-stone-700 font-bold">14 require immediate dispatch</span>
                  </div>
                </div>

                {/* Visual Chart 3: Municipal Risk Distribution Ranking */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Flagged Cases by Municipality</span>
                      <span className="text-[10px] text-stone-500 font-mono">5 LGUs Audited</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                      Click any municipality to view spatial coordinates and field status on the map below.
                    </p>

                    <div className="space-y-2">
                      {[
                        { name: 'Calamba City', flags: 14, pct: 43.8, color: 'bg-rose-600', active: selectedCluster === 'Calamba City' },
                        { name: 'Santa Rosa', flags: 8, pct: 25.0, color: 'bg-amber-600', active: selectedCluster === 'Santa Rosa' },
                        { name: 'San Pedro', flags: 6, pct: 18.8, color: 'bg-rose-600', active: selectedCluster === 'San Pedro' },
                        { name: 'Los Baños', flags: 3, pct: 9.4, color: 'bg-amber-600', active: selectedCluster === 'Los Baños' },
                        { name: 'Biñan City', flags: 1, pct: 3.1, color: 'bg-emerald-600', active: selectedCluster === 'Biñan City' },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCluster(item.name)}
                          className={`w-full text-left p-1.5 rounded-lg transition flex items-center justify-between cursor-pointer ${
                            item.active ? 'bg-white shadow-2xs border border-stone-300 ring-1 ring-[#132e4f]' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-xs font-semibold text-stone-800">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-stone-900">{item.flags}</span>
                            <span className="text-[10px] text-stone-400 font-mono">({item.pct}%)</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex justify-between items-center">
                    <button
                      onClick={() => onNavigateToScreen('triage')}
                      className="text-xs font-semibold text-[#132e4f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open all 32 cases in Triage Queue</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VISUAL 2: DISPATCHED TO FIELD (12 Tasks) */}
          {activeVisualMetric === 'dispatched_tasks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Field Pipeline Velocity Chart */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Field Investigation Pipeline</span>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                        12 Active Dispatches
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Real-time status of physical house-to-house verifications assigned to DSWD Municipal Links.
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">In-Field On-Site Verification</span>
                          <span className="font-mono font-bold text-amber-700">7 Tasks (58.3%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1.5">
                          <div className="bg-amber-600 h-full rounded-full" style={{ width: '58.3%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500 block">Caseworkers actively conducting physical inspections today</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Evidence Uploaded (Pending Signoff)</span>
                          <span className="font-mono font-bold text-[#132e4f]">3 Tasks (25.0%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1.5">
                          <div className="bg-[#132e4f] h-full rounded-full" style={{ width: '25.0%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500 block">Geo-tagged photos & utility meter readings ready for supervisor review</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Queued for Route Itinerary</span>
                          <span className="font-mono font-bold text-stone-600">2 Tasks (16.7%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1.5">
                          <div className="bg-stone-400 h-full rounded-full" style={{ width: '16.7%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500 block">Assigned to Municipal Links; itinerary scheduled for tomorrow</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>Avg. Turnaround: 3.2 Days</span>
                    <span className="text-emerald-700 font-semibold">Under 5-Day SLA Target</span>
                  </div>
                </div>

                {/* Municipal Links Deployment Roster */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Municipal Links Field Deployments</span>
                      <span className="text-[10px] text-stone-500 font-mono">Laguna Field Division</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                      Civil service caseworkers carrying encrypted mobile inspection tablets.
                    </p>

                    <div className="space-y-2">
                      {[
                        { name: 'Maria Santos', id: '#ML-04', lgu: 'Calamba City', tasks: '6 tasks (4 active, 2 uploaded)', status: 'Active In Field' },
                        { name: 'Juan Reyes', id: '#ML-07', lgu: 'Santa Rosa', tasks: '3 tasks (2 active, 1 uploaded)', status: 'Active In Field' },
                        { name: 'Elena Diaz', id: '#ML-02', lgu: 'San Pedro', tasks: '2 tasks (1 active, 1 queued)', status: 'En Route' },
                        { name: 'Ramon Bautista', id: '#ML-11', lgu: 'Los Baños', tasks: '1 task (queued for visit)', status: 'Assigned' },
                      ].map((officer, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-stone-200/80 flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-[#132e4f]" />
                              <span className="text-xs font-bold text-stone-900">{officer.name}</span>
                              <span className="text-[10px] font-mono text-stone-400">{officer.id}</span>
                            </div>
                            <span className="text-[11px] text-stone-600 block mt-0.5">{officer.lgu} · {officer.tasks}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                            {officer.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex justify-between items-center">
                    <button
                      onClick={() => onNavigateToScreen('field_tasks')}
                      className="text-xs font-semibold text-[#132e4f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Field Task Dispatch Screen</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Evidence Standards & Audit Proof Gauge */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Evidence Compliance & Integrity</span>
                      <span className="text-[10px] text-stone-500 font-mono">COA Compliance</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Every completed verification requires statutory photographic and physical proof.
                    </p>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-stone-200/80">
                        <span className="text-stone-700">Geo-Tagged Meter Photo</span>
                        <span className="text-emerald-700 font-bold font-mono">100% Mandatory</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-stone-200/80">
                        <span className="text-stone-700">Barangay Attestation Stamp</span>
                        <span className="text-emerald-700 font-bold font-mono">100% Mandatory</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-stone-200/80">
                        <span className="text-stone-700">Beneficiary Acknowledgement</span>
                        <span className="text-emerald-700 font-bold font-mono">Biometric / Sign</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-stone-200/80">
                        <span className="text-stone-700">Audit Trail Immutable Log</span>
                        <span className="text-[#132e4f] font-bold font-mono">SHA-256 Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">
                    All completed verification reports are exportable to Commission on Audit (COA) dockets.
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VISUAL 3: ACTIVE BENEFICIARIES (4,850 Baseline) */}
          {activeVisualMetric === 'active_beneficiaries' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Visual Chart 1: Laguna Provincial Caseload by LGU */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Laguna Caseload by Municipality</span>
                      <span className="text-[10px] text-stone-500 font-mono">4,850 Households</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Comparative distribution of regular 4Ps conditional cash transfer recipients in the cluster.
                    </p>

                    <div className="space-y-2.5">
                      {[
                        { name: 'Calamba City', count: 1420, pct: 29.3 },
                        { name: 'Santa Rosa', count: 1150, pct: 23.7 },
                        { name: 'San Pedro', count: 890, pct: 18.4 },
                        { name: 'Biñan City', count: 810, pct: 16.7 },
                        { name: 'Los Baños', count: 580, pct: 12.0 },
                      ].map((lgu, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-700 font-medium">{lgu.name}</span>
                            <span className="font-mono font-bold text-stone-900">{lgu.count.toLocaleString()} ({lgu.pct}%)</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#132e4f] h-full rounded-full" style={{ width: `${lgu.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>99.2% Biometrically Enrolled</span>
                    <span className="text-emerald-700 font-semibold">PhilSys Seeded</span>
                  </div>
                </div>

                {/* Visual Chart 2: Grant Component Allocation */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">CCT Grant Component Distribution</span>
                      <span className="text-[10px] text-stone-500 font-mono">RA 11310 Entitlements</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Allocation of monthly assistance packages based on household conditionalities.
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Education Grants (Elem/HS)</span>
                          <span className="font-mono font-bold text-stone-900">64% of Funds</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: '64%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500">Requires 85% verified school attendance monthly</span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Health & Nutrition Grants</span>
                          <span className="font-mono font-bold text-stone-900">28% of Funds</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1">
                          <div className="bg-[#132e4f] h-full rounded-full" style={{ width: '28%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500">Requires regular health center checkups & deworming</span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Rice Subsidy Allowance</span>
                          <span className="font-mono font-bold text-stone-900">8% of Funds</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1">
                          <div className="bg-amber-600 h-full rounded-full" style={{ width: '8%' }} />
                        </div>
                        <span className="text-[10px] text-stone-500">₱600 fixed monthly rice cash subsidy</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>Disbursement Channel: LandBank Prepaid Card</span>
                    <span className="font-semibold text-stone-700">100% Direct Deposit</span>
                  </div>
                </div>

                {/* Visual Chart 3: SWDI Baseline Status */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Social Well-Being Status (SWDI)</span>
                      <span className="text-[10px] text-stone-500 font-mono">Bi-Annual Assessment</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Caseload progression across the 3 statutory economic well-being tiers.
                    </p>

                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Level 1: Survival</span>
                          <span className="font-mono font-bold text-stone-700">3,120 HH (64.3%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-stone-600 h-full rounded-full" style={{ width: '64.3%' }} />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Level 2: Subsistence</span>
                          <span className="font-mono font-bold text-stone-700">1,726 HH (35.6%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-600 h-full rounded-full" style={{ width: '35.6%' }} />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-stone-800">Level 3: Self-Sufficient (Exit)</span>
                          <span className="font-mono font-bold text-emerald-700">4 HH (0.1%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: '10%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">
                    SWDI scores dictate transition planning under DSWD Memorandum Circular No. 22.
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VISUAL 4: GRADUATED THIS CYCLE (4 Exits) */}
          {activeVisualMetric === 'graduated_cycle' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Quarterly Target Completion Ring & Metrics */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Quarterly Graduation Quota</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                        Q3 Target: 6 Exits
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Households achieving sustainable non-subsidized livelihood (SWDI Level 3).
                    </p>

                    <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-stone-200/80">
                      <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-stone-100"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-emerald-700"
                            strokeDasharray="66.7, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-800 tabular-nums">
                          67%
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-sm font-bold text-stone-900 block">4 of 6 Confirmed</span>
                        <p className="text-[11px] text-stone-500 leading-tight">
                          2 additional households currently completing final 15-day notice review.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex justify-between items-center">
                    <span>Statutory Basis: RA 11310 §4</span>
                    <span className="text-emerald-700 font-semibold">Pugay Tagumpay Certified</span>
                  </div>
                </div>

                {/* Transition Milestones Checklist */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Post-Graduation Transition Milestones</span>
                      <span className="text-[10px] text-stone-500 font-mono">DTI / SLP Endorsement</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                      Statutory sustainability packages granted upon exit to prevent recidivism.
                    </p>

                    <div className="space-y-2">
                      {[
                        { title: 'DTI Livelihood Capital Seed Grant', status: '4/4 Completed (100%)', ok: true },
                        { title: 'PhilSys Biometric Transition ID Issued', status: '4/4 Completed (100%)', ok: true },
                        { title: 'Sustainable Non-Subsidized Household Income', status: '3/4 Confirmed (75%)', ok: false },
                        { title: 'Local LGU Social Protection Registry Transfer', status: '4/4 Completed (100%)', ok: true },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-stone-200/80 flex items-center justify-between">
                          <span className="text-xs text-stone-800 font-medium">{item.title}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            item.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-amber-50 text-amber-900 border border-amber-200/80'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex justify-between items-center">
                    <button
                      onClick={() => onNavigateToScreen('due_process')}
                      className="text-xs font-semibold text-[#132e4f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Review 15-Day Statutory Due Process Dockets</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Due Process & Notice Summary */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-800">Notice & Appeal Docket Status</span>
                      <span className="text-[10px] text-stone-500 font-mono">15-Day Statutory Window</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">
                      Zero involuntary delisting occurs without formal written Notice of Ineligibility and appeal opportunity.
                    </p>

                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80 flex justify-between items-center">
                        <span className="text-xs text-stone-700">Notices Served via Municipal Link</span>
                        <span className="text-xs font-mono font-bold text-stone-900">4 Served</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80 flex justify-between items-center">
                        <span className="text-xs text-stone-700">Appeals Filed within 15 Days</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">0 Contested</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200/80 flex justify-between items-center">
                        <span className="text-xs text-stone-700">Uncontested Formal Exits</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">4 Confirmed</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">
                    Beneficiaries retain legal right to appeal under DSWD Grievance Redress System (GRS).
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. Regional Map & Cluster Explorer with Minimal Philippine Map & Jurisdiction Inspector */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-stone-100 text-[#132e4f] rounded-md border border-stone-200">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-display">
                Operations Geography & Jurisdictions
              </h3>
              <p className="text-xs text-stone-500">
                Philippine archipelago locator with Laguna de Bay operational cluster [14.2144° N, 121.1652° E]
              </p>
            </div>
          </div>

          {/* View Toggle: Map View vs. Comparative Matrix */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setGeoViewMode('map')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                geoViewMode === 'map' ? 'bg-[#132e4f] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Spatial Map View
            </button>
            <button
              type="button"
              onClick={() => setGeoViewMode('matrix')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                geoViewMode === 'matrix' ? 'bg-[#132e4f] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Comparative LGU Matrix
            </button>
          </div>
        </div>

        {/* Map Visualizer & Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          
          {/* Left 2 Columns: Map View OR Comparative Municipal Matrix */}
          <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-stone-200/90 flex flex-col justify-between">
            {geoViewMode === 'map' ? (
              <MinimalPhMap
                pins={lagunaPins}
                selectedCluster={selectedCluster}
                onSelectCluster={setSelectedCluster}
              />
            ) : (
              /* COMPARATIVE MUNICIPAL RISK MATRIX (When matrix view toggled) */
              <div className="p-5 sm:p-6 space-y-4 bg-stone-50/40 min-h-[380px]">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-xs font-bold text-stone-800">Laguna Pilot Municipalities Comparison</span>
                  <span className="text-[11px] text-stone-500 font-mono">5 LGUs Active</span>
                </div>

                <div className="space-y-3">
                  {lagunaPins.map((pin) => {
                    const isSelected = selectedCluster === pin.municipality;
                    const details = MUNICIPALITY_METRICS[pin.municipality];
                    return (
                      <div
                        key={pin.id}
                        onClick={() => setSelectedCluster(pin.municipality)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#132e4f] ring-2 ring-[#132e4f]/20 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              pin.status === 'RED' ? 'bg-rose-600' :
                              pin.status === 'AMBER' ? 'bg-amber-600' : 'bg-emerald-600'
                            }`} />
                            <span className="text-sm font-bold text-stone-900 font-display">{pin.municipality}</span>
                            {pin.calamityActive && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                                RA 10121 Moratorium
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-xs">
                            <span className="text-stone-500">
                              Risk Score: <strong className="text-stone-900 font-mono">{pin.riskScore.toFixed(1)}</strong>
                            </span>
                            <span className="text-stone-500">
                              Flagged: <strong className="text-rose-700 font-mono">{pin.flaggedCount}</strong>
                            </span>
                            <span className="text-stone-500">
                              Dispatched: <strong className="text-amber-800 font-mono">{pin.dispatchedCount}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Progress comparison bar */}
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${
                              pin.status === 'RED' ? 'bg-rose-600' :
                              pin.status === 'AMBER' ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${pin.riskScore}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span>{pin.note}</span>
                          <span className="font-semibold text-[#132e4f]">{details?.assignedWorker.split(' ')[0]} {details?.assignedWorker.split(' ')[1]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Cluster Details Panel - ENRICHED VISUAL INSPECTOR */}
          <div className="p-5 sm:p-6 flex flex-col justify-between bg-white">
            <div className="space-y-4">
              
              {/* Header with Municipality and Risk Level */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    Selected Jurisdiction
                  </span>
                  <h4 className="text-lg font-bold text-stone-900 mt-0.5 font-display">
                    {activePin.municipality}
                  </h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                  activePin.status === 'RED' ? 'bg-rose-50 text-rose-800 border-rose-200/80' :
                  activePin.status === 'AMBER' ? 'bg-amber-50 text-amber-900 border-amber-200/80' :
                  'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                }`}>
                  {activePin.status === 'RED' ? 'High Risk (Score ≥ 70)' : activePin.status === 'AMBER' ? 'Under Review' : 'Compliant'}
                </span>
              </div>

              {/* Visual 1: Composite Risk Score Gauge */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-stone-600 font-medium">Composite Risk Score</span>
                  <span className={`font-mono font-bold text-sm ${
                    activePin.riskScore >= 70 ? 'text-rose-700' :
                    activePin.riskScore >= 50 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {activePin.riskScore.toFixed(1)} / 100
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      activePin.riskScore >= 70 ? 'bg-rose-600' :
                      activePin.riskScore >= 50 ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${activePin.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>Baseline Threshold: 70.0</span>
                  <span>{activePin.riskScore >= 70 ? '+14.0 pts above flag limit' : 'Within normal bounds'}</span>
                </div>
              </div>

              {/* Caseload Stat Pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                  <span className="text-[11px] text-stone-500 block">Flagged Cases</span>
                  <span className="text-xl font-bold text-stone-900 mt-0.5 block tabular-nums">
                    {activePin.flaggedCount}
                  </span>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                  <span className="text-[11px] text-stone-500 block">Field Dispatched</span>
                  <span className="text-xl font-bold text-stone-900 mt-0.5 block tabular-nums">
                    {activePin.dispatchedCount}
                  </span>
                </div>
              </div>

              {/* Visual 2: Discrepancy Breakdown for this Municipality */}
              <div>
                <span className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Audit Discrepancy Breakdown:
                </span>
                
                {/* Segmented Visual Bar */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-100 mb-2">
                  {activeClusterDetails.discrepancies.map((disc, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${disc.pct}%` }}
                      className={`${disc.color} h-full`}
                      title={`${disc.label}: ${disc.count} (${disc.pct}%)`}
                    />
                  ))}
                </div>

                {/* Breakdown items */}
                <div className="space-y-1.5">
                  {activeClusterDetails.discrepancies.map((disc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-stone-700 bg-stone-50 px-2.5 py-1.5 rounded border border-stone-200/60">
                      <span className="flex items-center space-x-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${disc.color}`} />
                        <span className="truncate">{disc.label}</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 shrink-0 pl-2">{disc.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual 3: Field Verification Progress & Assigned Officer */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-600 font-medium">Field Dispatch Coverage</span>
                  <span className="font-mono font-bold text-stone-900">
                    {activePin.dispatchedCount} of {activePin.flaggedCount} ({activeClusterDetails.fieldCoveragePct}%)
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#132e4f] h-full rounded-full"
                    style={{ width: `${activeClusterDetails.fieldCoveragePct}%` }}
                  />
                </div>
                <div className="text-[11px] text-stone-600 pt-1 flex items-center justify-between">
                  <span className="text-stone-500">Designated Link:</span>
                  <span className="font-semibold text-[#132e4f]">{activeClusterDetails.assignedWorker}</span>
                </div>
              </div>

              {/* Statutory Moratorium Notice if active */}
              {activePin.calamityActive && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-semibold block">Statutory Moratorium Active (RA 10121):</span>
                  <p className="text-[11px] leading-relaxed">
                    Field verification proceeds without delay. Involuntary delisting frozen during calamity state.
                  </p>
                </div>
              )}
            </div>

            {/* Action CTA to open filtered triage queue */}
            <div className="pt-4 border-t border-stone-100 mt-4">
              <button
                id="view-cluster-triage-btn"
                onClick={() => onNavigateToScreen('triage')}
                className="w-full py-2.5 bg-[#132e4f] hover:bg-[#0c2340] text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Filter Triage Queue for {activePin.municipality}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
