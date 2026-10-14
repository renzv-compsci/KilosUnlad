import React, { useEffect, useMemo, useState } from 'react';
import type { ScreenId } from '../../types/navigation';
import type { BeneficiaryTriageItem } from '../../types/contracts';
import { apiErrorMessage, fetchAdminTasks, fetchInsightsOverview, fetchMapDensity, fetchTriagePage, InsightsOverview, type MapDensity, type TriageSummary } from '../../services/api';
import { displayDate } from '../../utils/displayDate';
import { 
  Users, 
  AlertOctagon, 
  Send, 
  Award, 
  AlertTriangle, 
  Compass,
  ChevronRight,
  UserCheck,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import type { ClusterPin, MapHousehold } from '../dashboard/MinimalPhMap';

// Leaflet needs a browser; load the map only when it is shown (keeps the first paint light).
const MinimalPhMap = React.lazy(() => import('../dashboard/MinimalPhMap').then(m => ({ default: m.MinimalPhMap })));

interface Screen2DashboardProps {
  onNavigateToScreen: (screen: ScreenId) => void;
  triageCount?: number;
  triageItems?: BeneficiaryTriageItem[];
  triageLoading?: boolean;
  triageSummary?: TriageSummary | null;
  showSpecAnnotations?: boolean;
}

export type MetricVisualType = 'active_beneficiaries' | 'flagged_review' | 'dispatched_tasks' | 'graduated_cycle';

export const Screen2Dashboard: React.FC<Screen2DashboardProps> = ({
  onNavigateToScreen,
  triageCount,
  triageItems = [],
  triageLoading = false,
  triageSummary = null,
  showSpecAnnotations = false,
}) => {
  // Live aggregates for the caller's jurisdiction (GET /insights/overview, DECISION-010).
  const [overview, setOverview] = useState<InsightsOverview | null>(null);
  const [reviewHouseholds, setReviewHouseholds] = useState<BeneficiaryTriageItem[] | null>(null);
  const [density, setDensity] = useState<MapDensity | null>(null);
  const [taskByHousehold, setTaskByHousehold] = useState<Map<string, string>>(new Map());
  const [overviewError, setOverviewError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchInsightsOverview(controller.signal).then(setOverview)
      .catch(failure => { if (!controller.signal.aborted) setOverviewError(apiErrorMessage(failure)); });
    // Map dots: every household in a review stage (existing triage feed, same jurisdiction scope).
    const allPages = async (status: string) => {   // up to 1,000 households per stage
      const first = await fetchTriagePage(1, controller.signal, status, 100);
      const rest = await Promise.all(Array.from({ length: Math.max(0, Math.min(first.pagination.total_pages, 10) - 1) },
        (_, i) => fetchTriagePage(i + 2, controller.signal, status, 100)));
      return [first, ...rest].flatMap(page => page.items);
    };
    Promise.all(['FLAGGED_FOR_REVIEW', 'UNDER_INVESTIGATION', 'NOTICE_OF_INELIGIBILITY'].map(allPages))
      .then(stages => setReviewHouseholds(stages.flat()))
      .catch(() => { /* the map falls back to the queue page already loaded */ });
    // All households in scope as map-cell counts, and each household's latest field-task status.
    fetchMapDensity(controller.signal).then(setDensity).catch(() => { /* the layer is simply not shown */ });
    (async () => {
      const first = await fetchAdminTasks({ page: 1, limit: 100 }, controller.signal);
      const rest = await Promise.all(Array.from({ length: Math.max(0, Math.min(first.pagination.total_pages, 10) - 1) },
        (_, i) => fetchAdminTasks({ page: i + 2, limit: 100 }, controller.signal)));
      const latest = new Map<string, string>();   // tasks come newest first
      for (const task of [first, ...rest].flatMap(page => page.items)) if (!latest.has(task.household_id)) latest.set(task.household_id, task.task_status);
      setTaskByHousehold(latest);
    })().catch(() => { /* without tasks, dispatched households show as open field tasks */ });
    return () => controller.abort();
  }, []);

  const [activeVisualMetric, setActiveVisualMetric] = useState<MetricVisualType>('flagged_review');
  const [geoViewMode, setGeoViewMode] = useState<'map' | 'matrix'>('map');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const pct = (part: number, whole: number) => whole ? Math.round((1000 * part) / whole) / 10 : 0;
  const triggerLabel = useMemo(() => new Map((overview?.risk.triggers ?? []).map(t => [t.code, t.label])), [overview]);
  const pins: ClusterPin[] = useMemo(() => (overview?.municipalities ?? []).map((m, index) => ({
    id: `pin-${index + 1}`,
    municipality: m.municipality,
    coordinates: m.centroid ?? [121.1652, 14.2144],
    status: m.high_risk > 0 ? 'RED' : m.under_investigation + m.notice > 0 ? 'AMBER' : 'GREEN',
    riskScore: m.average_flagged_score ?? 0,
    flaggedCount: m.high_risk,
    dispatchedCount: m.under_investigation,
    note: m.top_triggers.length ? m.top_triggers.map(t => `${triggerLabel.get(t.code) ?? t.code} (${t.count})`).join(' · ') : 'No trigger badges recorded',
    calamityActive: m.calamity_active,
  })), [overview, triggerLabel]);
  const activePin = pins.find((p) => p.municipality === selectedCluster) || pins[0];
  const activeMunicipality = overview?.municipalities.find(m => m.municipality === activePin?.municipality);
  const BAR_COLORS = ['bg-rose-600', 'bg-amber-600', 'bg-[#13233f]', 'bg-emerald-600', 'bg-stone-500'];
  const activeTriggers = (activeMunicipality?.top_triggers ?? []).map((t, idx) => ({
    label: triggerLabel.get(t.code) ?? t.code, count: t.count, color: BAR_COLORS[idx % BAR_COLORS.length],
    pct: pct(t.count, activeMunicipality!.top_triggers.reduce((sum, x) => sum + x.count, 0)),
  }));

  const h = overview?.households, r = overview?.risk, t = overview?.tasks;
  const openTasks = t ? t.by_status.PENDING_DISPATCH + t.by_status.CACHED_OFFLINE : 0;
  const verifiedTasks = t ? t.by_status.VERIFIED_GRADUATE + t.by_status.VERIFIED_RETAIN : 0;
  const triggerTotal = r?.triggers.reduce((sum, x) => sum + x.count, 0) ?? 0;
  const criticalPct = r ? pct(r.critical, r.high_risk) : 0;
  const levelTotal = h ? Object.values(h.by_enrolled_level).reduce((a, b) => a + b, 0) : 0;
  const LEVEL_NAMES: Record<string, string> = { '1': 'Level 1: Survival', '2': 'Level 2: Subsistence', '3': 'Level 3: Self-Sufficient' };
  const STATUS_NAMES: Record<string, string> = { ACTIVE_COMPLIANT: 'Active, compliant', FLAGGED_FOR_REVIEW: 'Flagged for review',
    UNDER_INVESTIGATION: 'Under investigation', NOTICE_OF_INELIGIBILITY: 'Notice of ineligibility', GRADUATED: 'Graduated', CALAMITY_SUSPENDED: 'Calamity-suspended' };
  const zones = overview?.calamity.active_zones ?? [];
  const mapHouseholds: MapHousehold[] = (reviewHouseholds ?? triageItems).filter(item => Array.isArray(item.address.coordinates)).map(item => ({
    household_id: item.household_id, name: item.head_of_household.full_name, barangay: item.address.barangay,
    municipality: item.address.municipality, score: item.composite_risk_score, status: item.status, task: taskByHousehold.get(item.household_id),
    coordinates: item.address.coordinates as [number, number],
  }));

  return (
    <div className="executive-dashboard">
      
      {/* Spec Annotation Header (Only shown when bindings toggled on) */}
      {showSpecAnnotations && (
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-[11px] font-mono text-slate-700 flex justify-between items-center">
          <div>
            <span className="font-semibold">Screen 2: Executive Dashboard & Regional Overview</span>
            <span className="ml-2 text-slate-500">Contract: admin-triage-feed.json</span>
          </div>
          <div>admin-insights-overview.json</div>
        </div>
      )}

      <div className="dashboard-heading">
        <div>
          <h2>Executive overview</h2>
          <p>{overview ? overview.municipalities.map(m => m.municipality).join(', ') || 'No households in scope' : 'Your jurisdiction'} <span aria-hidden="true">&middot;</span> Region IV-A</p>
        </div>
      <section className="live-workload" aria-labelledby="live-workload-title" aria-busy={triageLoading}>
        <div className="live-workload-heading">
          <div>
            <h3 id="live-workload-title">Triage queue <span>API records</span></h3>
            <p className="live-workload-total">{triageLoading ? 'Loading queue...' : triageCount === undefined ? 'Live queue count unavailable' : <><strong>{triageCount.toLocaleString()}</strong><span>{triageCount === 1 ? 'case' : 'cases'} awaiting review</span></>}</p>
          </div>
          <button type="button" onClick={() => onNavigateToScreen('triage')} className="primary-triage-action">
            <ClipboardList size={18} aria-hidden="true" />
            Open Triage Queue
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
      </div>

      <div className="live-overview-grid">
      <section className="api-workload-summary" aria-labelledby="api-summary-title" aria-busy={triageLoading}>
        <header><h3 id="api-summary-title">Current workload</h3><span>Assigned geographic scope</span></header>
        <dl>
          {([
            ['high_risk_count', 'High-risk beneficiaries'],
            ['under_investigation_count', 'Under investigation'],
            ['notice_of_ineligibility_count', 'Notices of ineligibility'],
          ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{triageLoading ? 'Loading...' : triageSummary ? triageSummary[key].toLocaleString() : 'Unavailable'}</dd></div>)}
        </dl>
        <details className="context-details"><summary>Count scope</summary><p>Counts cover all program statuses in your scope, not only the flagged queue. Categories may overlap.</p></details>
      </section>

      {triageCount !== undefined && !triageLoading && <section className="live-queue-preview" aria-labelledby="live-list-title">
        <div className="live-list-heading"><h3 id="live-list-title">Households in the queue</h3><span>{Math.min(3, triageItems.length)} shown from the current page</span></div>
        {triageCount === 0 ? <p className="live-workload-empty">No flagged cases in the current API response.</p> : triageItems.length > 0 && <ul className="live-households">{triageItems.slice(0, 3).map((item) => <li key={item.household_id}>
          <div><strong>{item.head_of_household.full_name}</strong><span>{item.household_id}</span></div>
          <div><strong>{item.address.municipality}</strong><span>{item.address.barangay}</span></div>
          <div className="live-household-risk"><span>Risk score</span><strong>{item.composite_risk_score.toFixed(1)} <small>/ 100</small></strong></div>
        </li>)}</ul>}
      </section>}
      </div>

      <section className="sample-analytics-section" aria-labelledby="sample-analytics-title" aria-busy={!overview && !overviewError}>
        <header className="sample-analytics-heading"><h3 id="sample-analytics-title">Regional snapshot</h3><span>{overview ? `Live · ${displayDate(overview.generated_at)}` : overviewError ? 'Unavailable' : 'Loading…'}</span></header>
      {overviewError && <p role="alert" className="live-workload-empty">{overviewError}</p>}
      {overview && h && r && t && <>
      <section className="sample-snapshot" aria-label="Caseload summary">
      <div className="metric-summary-grid" aria-label="Caseload summary">
        {[
          { key: 'active_beneficiaries', id: 'metric-active-beneficiaries', label: 'Households in Scope', value: h.total.toLocaleString(), note: 'All program statuses', badge: `${h.by_status.ACTIVE_COMPLIANT.toLocaleString()} compliant`, Icon: Users, tone: 'navy' },
          { key: 'flagged_review', id: 'metric-flagged-review', label: 'Flagged by Risk Score', value: r.high_risk.toLocaleString(), note: 'Cross-match discrepancies', badge: `Risk score ≥ ${r.flag_threshold}`, Icon: AlertOctagon, tone: 'rose' },
          { key: 'dispatched_tasks', id: 'metric-dispatched-tasks', label: 'Open Field Tasks', value: openTasks.toLocaleString(), note: 'Awaiting a home visit', badge: `${t.total} dispatched in total`, Icon: Send, tone: 'amber' },
          { key: 'graduated_cycle', id: 'metric-graduated-cycle', label: 'Graduated', value: h.by_status.GRADUATED.toLocaleString(), note: 'Program exits', badge: `${t.by_status.VERIFIED_GRADUATE} verified by field visit`, Icon: Award, tone: 'emerald' },
        ].map(({ key, id, label, value, note, badge, Icon, tone }) => (
          <article key={key} id={id} title={note} className={`metric-summary metric-${tone}`}>
            <span className="metric-card-heading"><span>{label}</span><Icon size={19} aria-hidden="true" /></span>
            <span className="metric-value">{value}</span>
            <span className="metric-badge">{badge}</span>
          </article>
        ))}
      </div>
      </section>

      <div id="metric-visual-deck" className="analytics-section">
        <div className="analytics-heading">
          <h3>
            {activeVisualMetric === 'flagged_review' && 'Flagged cases'}
            {activeVisualMetric === 'dispatched_tasks' && 'Field operations'}
            {activeVisualMetric === 'active_beneficiaries' && 'Beneficiary caseload'}
            {activeVisualMetric === 'graduated_cycle' && 'Graduation and due process'}
          </h3>
          <div className="analytics-tabs" role="group" aria-label="Analytics view">
            {([['flagged_review', 'Flagged'], ['dispatched_tasks', 'Field Dispatched'], ['active_beneficiaries', 'Caseload'], ['graduated_cycle', 'Graduated']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveVisualMetric(key)} aria-pressed={activeVisualMetric === key}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${activeVisualMetric === key ? 'analytics-tab-active bg-white text-stone-900 font-semibold' : 'text-stone-600 hover:text-stone-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="analytics-body">
          {activeVisualMetric === 'flagged_review' && (
            <div className="analytics-columns flagged-analytics">
              <section className="analytics-column trigger-chart" aria-labelledby="trigger-chart-title">
                <div className="chart-heading"><h4 id="trigger-chart-title">Cross-match triggers</h4><span>{triggerTotal} badges</span></div>
                <div className="trigger-chart-bars">
                  {r.triggers.length === 0 && <p className="text-[11px] text-stone-500">No trigger badges recorded.</p>}
                  {r.triggers.map((item) => (
                    <div key={item.code} className="chart-bar-row chart-navy">
                      <div><span>{item.label}</span><strong>{item.count} <small>{pct(item.count, triggerTotal)}%</small></strong></div>
                      <div className="chart-bar-track" aria-hidden="true"><span style={{ width: `${pct(item.count, triggerTotal)}%` }} /></div>
                    </div>
                  ))}
                </div>
                <details className="chart-footnote context-details">
                  <summary>Trigger definitions</summary>
                  <p>Power: consumption above the 200 kWh/month lifeline. LTO: registered vehicle match. A household can carry more than one badge.</p>
                </details>
              </section>

              <section className="analytics-column severity-chart" aria-labelledby="severity-chart-title">
                <div className="chart-heading"><h4 id="severity-chart-title">Risk severity</h4><span>Flag threshold: {r.flag_threshold}</span></div>
                <div className="severity-donut" role="img" aria-label={`${r.high_risk} flagged cases: ${r.critical} critical, ${r.high} high priority`}>
                  <svg viewBox="0 0 240 240" aria-hidden="true">
                    <circle cx="120" cy="120" r="96" fill="none" stroke="#f7eeed" strokeWidth="22" />
                    {r.high > 0 && <circle className="risk-high" cx="120" cy="120" r="96" fill="none" strokeWidth="22" pathLength="100" strokeDasharray={`${100 - criticalPct} ${criticalPct}`} transform={`rotate(${-90 + criticalPct * 3.6} 120 120)`} />}
                    {r.critical > 0 && <circle className="risk-critical" cx="120" cy="120" r="96" fill="none" strokeWidth="22" pathLength="100" strokeDasharray={`${criticalPct} ${100 - criticalPct}`} transform="rotate(-90 120 120)" />}
                  </svg>
                  <div><strong>{r.high_risk}</strong><span>cases</span></div>
                </div>
                <div className="severity-legend">
                  <div><span><i className="legend-dot risk-critical" />Critical</span><strong>{r.critical} <small>cases</small></strong><small>Score 80-100</small></div>
                  <div><span><i className="legend-dot risk-high" />High priority</span><strong>{r.high} <small>cases</small></strong><small>Score {r.flag_threshold}-79</small></div>
                </div>
                <div className="severity-baseline"><span>Below threshold <small>Score &lt; {r.flag_threshold}</small></span><strong>{r.below_threshold.toLocaleString()}</strong></div>
                <details className="chart-footnote context-details"><summary>Priority guidance</summary><p>{r.critical} critical case{r.critical === 1 ? '' : 's'} should be dispatched first. Average flagged score: {r.average_flagged_score ?? '—'}.</p></details>
              </section>

              <section className="analytics-column municipality-chart" aria-labelledby="municipality-chart-title">
                <div className="chart-heading"><h4 id="municipality-chart-title">Flags by municipality</h4><span>{pins.length} LGU{pins.length === 1 ? '' : 's'}</span></div>
                <div className="municipality-ranks">
                  {pins.map((item) => (
                    <button key={item.id} type="button" aria-pressed={activePin?.municipality === item.municipality}
                      onClick={() => setSelectedCluster(item.municipality)} className="municipality-rank chart-navy">
                      <span>{item.municipality}</span>
                      <span className="chart-bar-track" aria-hidden="true"><span style={{ width: `${pct(item.flaggedCount, r.high_risk)}%` }} /></span>
                      <strong>{item.flaggedCount}</strong>
                      <small>{pct(item.flaggedCount, r.high_risk)}%</small>
                    </button>
                  ))}
                </div>
                <button type="button" className="chart-text-action" onClick={() => onNavigateToScreen('triage')}>
                  Open triage queue <ArrowRight size={15} aria-hidden="true" />
                </button>
              </section>
            </div>
          )}

          {activeVisualMetric === 'dispatched_tasks' && (
            <div className="space-y-6">
              <div className="analytics-columns">
                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Field Investigation Pipeline</span>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">{t.total} Tasks</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">Status of house-to-house verifications assigned to caseworkers.</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Awaiting home visit', count: openTasks, color: 'bg-amber-600', text: 'text-amber-700', help: 'Dispatched; the caseworker has not submitted a report yet' },
                        { label: 'Report submitted (pending sign-off)', count: t.by_status.SUBMITTED, color: 'bg-[#13233f]', text: 'text-[#13233f]', help: 'Geotagged evidence received and hash-verified' },
                        { label: 'Verified', count: verifiedTasks, color: 'bg-emerald-600', text: 'text-emerald-700', help: `${t.by_status.VERIFIED_GRADUATE} graduate · ${t.by_status.VERIFIED_RETAIN} retain` },
                      ].map(stage => (
                        <div key={stage.label} className="bg-white p-3 rounded-lg border border-stone-200/80">
                          <div className="flex flex-wrap justify-between gap-1 text-xs mb-1">
                            <span className="font-semibold text-stone-800">{stage.label}</span>
                            <span className={`font-mono font-bold ${stage.text}`}>{stage.count} ({pct(stage.count, t.total)}%)</span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-1.5">
                            <div className={`${stage.color} h-full rounded-full`} style={{ width: `${pct(stage.count, t.total)}%` }} />
                          </div>
                          <span className="text-[10px] text-stone-500 block">{stage.help}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500 flex flex-wrap justify-between gap-1 items-center">
                    <span>Avg. turnaround: {t.average_turnaround_hours === null ? '—' : t.average_turnaround_hours >= 48 ? `${(t.average_turnaround_hours / 24).toFixed(1)} days` : `${t.average_turnaround_hours} hours`}</span>
                    <span>Dispatch to report</span>
                  </div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Caseworker Deployments</span>
                      <span className="text-[10px] text-stone-500 font-mono">{t.workers.length} with tasks</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">Caseworkers holding tasks for households in your scope.</p>
                    <div className="space-y-2">
                      {t.workers.length === 0 && <p className="text-[11px] text-stone-500">No tasks dispatched yet.</p>}
                      {t.workers.map((officer) => (
                        <div key={officer.user_id} className="bg-white p-2.5 rounded-lg border border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-[#13233f] shrink-0" />
                              <span className="text-xs font-bold text-stone-900">{officer.full_name}</span>
                            </div>
                            <span className="text-[11px] text-stone-600 block mt-0.5">{officer.open} open · {officer.submitted} submitted · {officer.verified} verified</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${officer.open ? 'text-amber-900 bg-amber-50 border-amber-200/80' : 'text-emerald-800 bg-emerald-50 border-emerald-200/80'}`}>
                            {officer.open ? 'Visits pending' : 'Caught up'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex justify-between items-center">
                    <button onClick={() => onNavigateToScreen('dispatch_manager')} className="text-xs font-semibold text-[#13233f] hover:underline flex items-center gap-1 cursor-pointer">
                      <span>Open Caseworker Dispatch</span><ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Evidence Standards</span>
                      <span className="text-[10px] text-stone-500 font-mono">Enforced by the server</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3.5 leading-relaxed">Every field report must meet these checks before it is accepted.</p>
                    <div className="space-y-2.5">
                      {[['Geotagged photo within 250 m', 'Required'], ['Photo SHA-256 matches upload', 'Verified'], ['Caseworker covers the barangay', 'Required'], ['Report sealed in audit ledger', 'Hash chain']].map(([label, value]) => (
                        <div key={label} className="flex flex-wrap items-center justify-between gap-1 text-xs p-2 rounded bg-white border border-stone-200/80">
                          <span className="text-stone-700">{label}</span>
                          <span className="text-emerald-700 font-bold font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">COA auditors can verify every sealed report from the audit ledger.</div>
                </div>
              </div>
            </div>
          )}

          {activeVisualMetric === 'active_beneficiaries' && (
            <div className="space-y-6">
              <div className="analytics-columns">
                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Caseload by Municipality</span>
                      <span className="text-[10px] text-stone-500 font-mono">{h.total.toLocaleString()} Households</span>
                    </div>
                    <div className="space-y-2.5">
                      {overview.municipalities.map((lgu) => (
                        <div key={lgu.municipality}>
                          <div className="flex flex-wrap justify-between gap-1 text-xs mb-1">
                            <span className="text-stone-700 font-medium">{lgu.municipality}</span>
                            <span className="font-mono font-bold text-stone-900">{lgu.households.toLocaleString()} ({pct(lgu.households, h.total)}%)</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#13233f] h-full rounded-full" style={{ width: `${pct(lgu.households, h.total)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Program Status</span>
                      <span className="text-[10px] text-stone-500 font-mono">RA 11310 lifecycle</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(h.by_status).map(([status, count]) => (
                        <div key={status} className="p-2.5 bg-white rounded-lg border border-stone-200/80 flex flex-wrap justify-between gap-1 text-xs">
                          <span className="font-semibold text-stone-800">{STATUS_NAMES[status] ?? status}</span>
                          <span className="font-mono font-bold text-stone-900">{count.toLocaleString()} ({pct(count, h.total)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Enrolled SWDI Level</span>
                      <span className="text-[10px] text-stone-500 font-mono">At enrolment</span>
                    </div>
                    <div className="space-y-2.5">
                      {Object.entries(h.by_enrolled_level).map(([level, count], idx) => (
                        <div key={level} className="p-2.5 bg-white rounded-lg border border-stone-200/80">
                          <div className="flex flex-wrap justify-between gap-1 text-xs mb-1">
                            <span className="font-semibold text-stone-800">{LEVEL_NAMES[level] ?? `Level ${level}`}</span>
                            <span className="font-mono font-bold text-stone-700">{count.toLocaleString()} HH ({pct(count, levelTotal)}%)</span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`${['bg-stone-600', 'bg-amber-600', 'bg-emerald-600'][idx % 3]} h-full rounded-full`} style={{ width: `${pct(count, levelTotal)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">The model predicts the current level; a gap above enrolment raises the risk score.</div>
                </div>
              </div>
            </div>
          )}

          {activeVisualMetric === 'graduated_cycle' && (
            <div className="space-y-6">
              <div className="analytics-columns">
                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Field Verification Outcomes</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">{verifiedTasks} verified</span>
                    </div>
                    <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-stone-200/80">
                      <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path className="text-stone-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-emerald-700" strokeDasharray={`${pct(t.by_status.VERIFIED_GRADUATE, verifiedTasks)}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-800 tabular-nums">{Math.round(pct(t.by_status.VERIFIED_GRADUATE, verifiedTasks))}%</div>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-sm font-bold text-stone-900 block">{t.by_status.VERIFIED_GRADUATE} graduate · {t.by_status.VERIFIED_RETAIN} retain</span>
                        <p className="text-[11px] text-stone-500 leading-tight">Share of verified visits that confirmed Level 3 (self-sufficiency).</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">Statutory basis: RA 11310 §4</div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Program Exits</span>
                      <span className="text-[10px] text-stone-500 font-mono">Current status</span>
                    </div>
                    <div className="space-y-2">
                      {[['Graduated', h.by_status.GRADUATED, true], ['Notice of ineligibility (15-day window)', h.by_status.NOTICE_OF_INELIGIBILITY, false], ['Calamity-suspended', h.by_status.CALAMITY_SUSPENDED, false]].map(([label, count, ok]) => (
                        <div key={String(label)} className="bg-white p-2.5 rounded-lg border border-stone-200/80 flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs text-stone-800 font-medium">{label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-amber-50 text-amber-900 border border-amber-200/80'}`}>{Number(count).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex justify-between items-center">
                    <button onClick={() => onNavigateToScreen('due_process')} className="text-xs font-semibold text-[#13233f] hover:underline flex items-center gap-1 cursor-pointer">
                      <span>Review 15-Day Due Process Dockets</span><ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="analytics-column flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-stone-800">Notice &amp; Appeal Docket</span>
                      <span className="text-[10px] text-stone-500 font-mono">15-Day Window</span>
                    </div>
                    <div className="space-y-2.5">
                      {[['Households under notice', overview.due_process.notices], ['Appeals filed (sealed in ledger)', overview.due_process.appeals_filed]].map(([label, value]) => (
                        <div key={String(label)} className="p-2.5 bg-white rounded-lg border border-stone-200/80 flex flex-wrap justify-between gap-1 items-center">
                          <span className="text-xs text-stone-700">{label}</span>
                          <span className="text-xs font-mono font-bold text-stone-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-500">No household is delisted without a written notice and the chance to appeal.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {zones.length > 0 && <div id="calamity-status-banner" className="moratorium-banner">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>Calamity moratorium active: {zones.map(z => z.municipality).join(', ')}</strong>
          <details className="context-details">
            <summary>Moratorium details</summary>
            {zones.map(z => <p key={`${z.municipality}-${z.declared_at}`}>{z.municipality}, {z.province}: declared {displayDate(z.declared_at)}{z.expires_at ? `, until ${displayDate(z.expires_at)}` : ', no end date'} ({z.ndrrmc_reference ?? 'no reference'}). Under RA 10121, dispatch, risk assessment and involuntary delisting are paused for these municipalities.</p>)}
          </details>
        </div>
        <button type="button" onClick={() => onNavigateToScreen('due_process')}>Review Appeals <ChevronRight size={15} aria-hidden="true" /></button>
      </div>}
      </>}
      </section>

      {overview && pins.length > 0 && activePin && <div className="geography-section">
        <div className="geography-heading">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-stone-100 text-[#13233f] rounded-md border border-stone-200"><Compass className="w-4 h-4" /></div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-display">Operations by municipality</h3>
              <p className="text-xs text-stone-500">{pins.length} municipalit{pins.length === 1 ? 'y' : 'ies'} in your scope</p>
            </div>
          </div>
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
            {([['map', 'Map'], ['matrix', 'Compare municipalities']] as const).map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setGeoViewMode(mode)} aria-pressed={geoViewMode === mode}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${geoViewMode === mode ? 'bg-[#13233f] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="geography-layout">
          <div className="geography-map min-w-0">
            {geoViewMode === 'map' ? (
              <React.Suspense fallback={<p className="p-6 text-xs text-stone-500" role="status">Loading map…</p>}>
                <MinimalPhMap pins={pins} selectedCluster={activePin.municipality} onSelectCluster={setSelectedCluster}
                  households={mapHouseholds} density={density?.cells ?? []} onOpenHousehold={() => onNavigateToScreen('triage')} />
              </React.Suspense>
            ) : (
              <div className="p-4 sm:p-6 space-y-4 bg-stone-50/40 min-h-[380px]">
                <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-stone-200">
                  <span className="text-xs font-bold text-stone-800">Municipalities Comparison</span>
                  <span className="text-[11px] text-stone-500 font-mono">{pins.length} LGUs</span>
                </div>
                <div className="space-y-3">
                  {pins.map((pin) => {
                    const isSelected = activePin.municipality === pin.municipality;
                    const tone = pin.status === 'RED' ? 'bg-rose-600' : pin.status === 'AMBER' ? 'bg-amber-600' : 'bg-emerald-600';
                    return (
                      <button type="button" key={pin.id} onClick={() => setSelectedCluster(pin.municipality)} aria-pressed={isSelected}
                        className={`block w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${isSelected ? 'bg-white border-[#13233f] ring-2 ring-[#13233f]/20 shadow-xs' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${tone}`} />
                            <span className="text-sm font-bold text-stone-900 font-display">{pin.municipality}</span>
                            {pin.calamityActive && <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded border border-amber-200">RA 10121 Moratorium</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span className="text-stone-500">Avg flagged score: <strong className="text-stone-900 font-mono">{pin.riskScore.toFixed(1)}</strong></span>
                            <span className="text-stone-500">Flagged: <strong className="text-rose-700 font-mono">{pin.flaggedCount}</strong></span>
                            <span className="text-stone-500">Investigating: <strong className="text-amber-800 font-mono">{pin.dispatchedCount}</strong></span>
                          </div>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pin.riskScore}%` }} />
                        </div>
                        <div className="text-[11px] text-stone-500">{pin.note}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="jurisdiction-inspector flex min-w-0 flex-col justify-between bg-white">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Selected Jurisdiction</span>
                  <h4 className="text-lg font-bold text-stone-900 mt-0.5 font-display">{activePin.municipality}</h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${activePin.status === 'RED' ? 'bg-rose-50 text-rose-800 border-rose-200/80' : activePin.status === 'AMBER' ? 'bg-amber-50 text-amber-900 border-amber-200/80' : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'}`}>
                  {activePin.status === 'RED' ? `Flagged households (≥ ${r?.flag_threshold ?? 70})` : activePin.status === 'AMBER' ? 'Under Review' : 'No flags'}
                </span>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs mb-1.5">
                  <span className="text-stone-600 font-medium">Average flagged risk score</span>
                  <span className={`font-mono font-bold text-sm ${activePin.riskScore >= 80 ? 'text-rose-700' : activePin.riskScore >= 70 ? 'text-amber-700' : 'text-emerald-700'}`}>{activePin.riskScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${activePin.riskScore >= 80 ? 'bg-rose-600' : activePin.riskScore >= 70 ? 'bg-amber-600' : 'bg-emerald-600'}`} style={{ width: `${activePin.riskScore}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>Flag threshold: {r?.flag_threshold ?? 70}</span>
                  <span>{activeMunicipality?.households.toLocaleString()} households</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[['Flagged', activePin.flaggedCount], ['Under investigation', activePin.dispatchedCount], ['Under notice', activeMunicipality?.notice ?? 0], ['Graduated', activeMunicipality?.graduated ?? 0]].map(([label, value]) => (
                  <div key={String(label)} className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                    <span className="text-[11px] text-stone-500 block">{label}</span>
                    <span className="text-xl font-bold text-stone-900 mt-0.5 block tabular-nums">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <span className="text-xs font-semibold text-stone-700 block mb-1.5">Top discrepancy triggers:</span>
                {activeTriggers.length === 0 && <p className="text-[11px] text-stone-500">None recorded.</p>}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-100 mb-2">
                  {activeTriggers.map((disc) => <div key={disc.label} style={{ width: `${disc.pct}%` }} className={`${disc.color} h-full`} title={`${disc.label}: ${disc.count}`} />)}
                </div>
                <div className="space-y-1.5">
                  {activeTriggers.map((disc) => (
                    <div key={disc.label} className="flex items-center justify-between text-xs text-stone-700 bg-stone-50 px-2.5 py-1.5 rounded border border-stone-200/60">
                      <span className="flex items-center space-x-1.5 truncate"><span className={`w-2 h-2 rounded-full shrink-0 ${disc.color}`} /><span className="truncate">{disc.label}</span></span>
                      <span className="font-mono font-bold text-stone-900 shrink-0 pl-2">{disc.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {activePin.calamityActive && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-semibold block">Statutory Moratorium Active (RA 10121):</span>
                  <p className="text-[11px] leading-relaxed">Dispatch and new risk assessments are paused. Involuntary delisting is frozen during the calamity.</p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-stone-100 mt-4">
              <button id="view-cluster-triage-btn" onClick={() => onNavigateToScreen('triage')}
                className="w-full py-2.5 bg-[#13233f] hover:bg-[#13233f] text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer">
                <span>Open Triage Queue</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>}

    </div>
  );
};
