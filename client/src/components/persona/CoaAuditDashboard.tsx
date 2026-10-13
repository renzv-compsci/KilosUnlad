import { AccessibleDialog } from '../common/AccessibleDialog';
import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileText, Scale, Link2, FileCheck2, AlertTriangle, ArrowRight, Users, X } from 'lucide-react';
import { apiErrorMessage, AuditBlockHeader, fetchAuditBlocks, fetchInsightsOverview, InsightsOverview } from '../../services/api';
import { displayDateTime } from '../../utils/displayDate';

interface CoaAuditDashboardProps {
  auditorName: string;
  onNavigateToLedger: () => void;
  onNavigateToSampling: () => void;
  showSpecAnnotations?: boolean;
}

const pct = (part: number, whole: number) => whole ? `${((100 * part) / whole).toFixed(1)}%` : '—';
const BAR = ['bg-[#132e4f]', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-700', 'bg-stone-500'];

// Live COA overview: GET /insights/overview (national scope) and GET /audit/blocks.
export const CoaAuditDashboard: React.FC<CoaAuditDashboardProps> = ({
  auditorName,
  onNavigateToLedger,
  onNavigateToSampling,
  showSpecAnnotations = false,
}) => {
  const [aomModalOpen, setAomModalOpen] = useState(false);
  const [aomPreviewed, setAomPreviewed] = useState(false);
  const [overview, setOverview] = useState<InsightsOverview | null>(null);
  const [blocks, setBlocks] = useState<AuditBlockHeader[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchInsightsOverview(controller.signal), fetchAuditBlocks({ limit: 8 }, controller.signal)])
      .then(([o, b]) => { setOverview(o); setBlocks(b.items); })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  const handlePreviewAOM = (e: React.FormEvent) => {
    e.preventDefault();
    setAomPreviewed(true);
  };
  const h = overview?.households, r = overview?.risk, t = overview?.tasks, a = overview?.audit;
  const fieldDone = t ? t.by_status.SUBMITTED + t.by_status.VERIFIED_GRADUATE + t.by_status.VERIFIED_RETAIN : 0;
  const triggerTotal = r?.triggers.reduce((sum, x) => sum + x.count, 0) ?? 0;

  return (
    <div className="module-page audit-page">
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600">admin-insights-overview.json · audit-block-list.json</div>
      )}

      <div className="module-heading">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#0c2340] border border-amber-400/80 text-amber-300 font-bold text-xs flex flex-col items-center justify-center shadow-2xs leading-none shrink-0">
            <span className="text-[11px] font-black">COA</span>
            <span className="text-[7px] text-amber-200/80 mt-0.5">STATE</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight font-display">Audit Overview</h2>
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Read-only</span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Auditor: <span className="font-semibold text-stone-800">{auditorName}</span>
              {overview && <> · as of {displayDateTime(overview.generated_at)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 self-start md:self-auto shrink-0">
          <button
            onClick={() => { setAomPreviewed(false); setAomModalOpen(true); }}
            disabled={!overview}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Preview Audit Observation</span>
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-rose-800">{error}</p>}
      {!overview && !error && <p role="status" className="text-xs text-stone-500">Loading audit overview…</p>}

      {overview && h && r && t && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Households on register</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{h.total.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-emerald-800">{h.by_status.ACTIVE_COMPLIANT.toLocaleString()} compliant</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">{h.by_status.GRADUATED} graduated · {h.by_status.CALAMITY_SUSPENDED} calamity-suspended</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Flagged by the model</span>
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-amber-900">{r.high_risk}</span>
            <span className="text-[11px] font-medium text-stone-500">{pct(r.high_risk, h.total)} of register</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">{r.critical} critical (≥80) · avg score {r.average_flagged_score ?? '—'}</div>
        </div>

        <button type="button" onClick={onNavigateToSampling}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Field verification coverage</span>
            <FileCheck2 className="w-4 h-4 text-[#132e4f]" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{pct(fieldDone, t.total)}</span>
            <span className="text-[11px] font-medium text-stone-600">{fieldDone} / {t.total} tasks</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Reports submitted or verified</span>
            <span className="text-stone-700 font-semibold underline">Inspect &rarr;</span>
          </div>
        </button>

        <button type="button" onClick={onNavigateToLedger}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Audit hash chain</span>
            <Link2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-[#132e4f]">{a?.total_blocks ?? 0}</span>
            <span className="text-[11px] font-medium text-stone-600">sealed blocks</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between gap-2">
            <span>{a?.last_timestamp ? `Last: ${displayDateTime(a.last_timestamp)}` : 'Ledger is empty'}</span>
            <span className="text-stone-700 font-semibold underline">Verify &rarr;</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900 font-display">Latest ledger blocks</h3>
              </div>
              <button id="coa-launch-chain-inspector-btn" onClick={onNavigateToLedger}
                className="px-3 py-1.5 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold text-xs rounded-lg shadow-2xs transition flex items-center space-x-1.5 cursor-pointer">
                <Link2 className="w-3.5 h-3.5" /><span>Open audit verification</span><ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
            {blocks.length === 0 && <p className="pt-3 text-xs text-stone-500">No blocks have been sealed yet.</p>}
            <ol className="pt-2 divide-y divide-stone-100">
              {blocks.map(b => (
                <li key={b.sequence_index} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#132e4f]">#{b.sequence_index}</span>{' '}
                    <span className="font-semibold text-stone-800">{b.action.replace(/_/g, ' ')}</span>{' '}
                    <span className="text-stone-500 break-all">{b.target_entity.entity_id}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 shrink-0">
                    {b.actor.username} ({b.actor.role}) · {displayDateTime(b.timestamp)}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 font-display">Discrepancy triggers on flagged households</h3>
              <span className="text-xs text-stone-500 font-mono">{r.high_risk} flagged</span>
            </div>
            {r.triggers.length === 0 && <p className="text-xs text-stone-500">No trigger badges recorded.</p>}
            <div className="space-y-3 pt-1">
              {r.triggers.map((trigger, index) => (
                <div key={trigger.code}>
                  <div className="flex flex-wrap justify-between gap-1 text-xs mb-1">
                    <span className="font-semibold text-stone-800">{trigger.label}</span>
                    <span className="font-mono text-stone-600 font-semibold">{trigger.count} ({pct(trigger.count, triggerTotal)})</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div className={`${BAR[index % BAR.length]} h-full`} style={{ width: pct(trigger.count, triggerTotal) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 font-display">Municipalities</h3>
            <p className="text-xs text-stone-500">Share of each municipality's households at or above the flag threshold.</p>
            <div className="space-y-2.5 pt-2">
              {overview.municipalities.map((lgu) => (
                <div key={`${lgu.province}-${lgu.municipality}`} className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-stone-900">
                    <span>{lgu.municipality}</span>
                    <span className="font-mono">{pct(lgu.high_risk, lgu.households)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-500">
                    <span>{lgu.high_risk} flagged of {lgu.households.toLocaleString()}</span>
                    <span className={`px-1.5 rounded font-medium text-[10px] ${lgu.calamity_active
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : lgu.high_risk ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                      {lgu.calamity_active ? 'Calamity hold' : lgu.high_risk ? 'Review needed' : 'No flags'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button onClick={onNavigateToSampling}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition text-center block cursor-pointer">
                Conduct Evidentiary Sampling Audit &rarr;
              </button>
            </div>
          </div>

          <div className="bg-stone-50 p-5 rounded-xl border border-stone-200/90 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#132e4f]" />
              <h4 className="text-xs font-bold text-stone-900 font-display">Auditor Independent Jurisdiction</h4>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              COA accounts are read-only: the server rejects any write from this role. Findings are served via formal Audit Observation Memorandums (AOM) to the DSWD Regional Director.
            </p>
          </div>
        </div>
      </div>
      </>}

      {/* Modal: Draft Audit Observation Memorandum (AOM) */}
      {aomModalOpen && (
        <AccessibleDialog titleId="aom-dialog-title" onClose={() => setAomModalOpen(false)} className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="dialog-sheet bg-white rounded-xl shadow-xl border border-stone-200/90 w-full max-w-lg">
            
            <div className="bg-stone-50/70 border-b border-stone-200/90 p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-700 text-white rounded-lg shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="aom-dialog-title" className="text-base font-bold text-stone-900 font-display">
                    Audit Observation Preview
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Draft from live figures; no official issuance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAomModalOpen(false)}
                aria-label="Close audit observation dialog"
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handlePreviewAOM} onChange={() => setAomPreviewed(false)} className="dialog-form text-sm text-stone-800">
              <div className="dialog-body space-y-4">
              <p className="preview-note">Preview only. This document is not saved, sent, or certified.</p>
              
              <div>
                <label htmlFor="aom-reference" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  AOM Reference Number
                </label>
                <input
                  id="aom-reference"
                  type="text"
                  readOnly
                  value={`COA-AOM-${new Date().getFullYear()}-DRAFT`}
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs bg-stone-100 text-stone-600"
                />
              </div>

              <div>
                <label htmlFor="aom-scope" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Audit Scope & Subject Matter
                </label>
                <select id="aom-scope" className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white">
                  {(r?.triggers ?? []).map(trigger => <option key={trigger.code}>{trigger.count} households: {trigger.label}</option>)}
                  {(r?.triggers ?? []).length === 0 && <option>No flagged households</option>}
                </select>
              </div>

              <div>
                <label htmlFor="aom-observations" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Observations & Recommendations <span className="required-label">(required)</span>
                </label>
                <textarea
                  id="aom-observations"
                  rows={4}
                  required
                  defaultValue={`Management is advised to expedite on-site SWDI verification of the ${r?.high_risk ?? 0} flagged households to avoid potential Notice of Disallowance under Section 12 of RA 11310.`}
                  className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#132e4f] outline-none leading-relaxed"
                />
              </div>

              </div>
              <footer className="dialog-footer">
                {aomPreviewed && <p role="status" className="dialog-feedback">Preview checked. Nothing was saved, sent, or certified.</p>}
                <button
                  type="button"
                  onClick={() => setAomModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium text-xs hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-submit-aom-btn"
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Check Preview</span>
                </button>
              </footer>

            </form>

          </div>
        </AccessibleDialog>
      )}

    </div>
  );
};
