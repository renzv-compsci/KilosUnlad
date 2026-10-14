import React, { useEffect, useState } from 'react';
import { AssessmentExplanation, BeneficiaryTriageItem } from '../../types/contracts';
import { apiErrorMessage, fetchAssessmentExplanation, fetchTriagePage } from '../../services/api';
import { displayDateTime } from '../../utils/displayDate';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  FileCheck, 
  AlertTriangle, 
  Scale, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface CoaEvidentiarySamplingProps {
  showSpecAnnotations?: boolean;
}

export const CoaEvidentiarySampling: React.FC<CoaEvidentiarySamplingProps> = ({
  showSpecAnnotations = false,
}) => {
  const [items, setItems] = useState<BeneficiaryTriageItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BeneficiaryTriageItem | null>(null);
  const [auditDecisionMap, setAuditDecisionMap] = useState<Record<string, 'CERTIFIED' | 'DISALLOWANCE_FLAG'>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<AssessmentExplanation | null | undefined>(undefined);

  // Sampling frame: every household the model flagged, in each review stage (triage feed, read-only).
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['FLAGGED_FOR_REVIEW', 'UNDER_INVESTIGATION', 'NOTICE_OF_INELIGIBILITY']
      .map(status => fetchTriagePage(1, controller.signal, status, 100)))
      .then(pages => {
        const all = pages.flatMap(p => p.items).sort((a, b) => b.composite_risk_score - a.composite_risk_score);
        setItems(all); setSelectedItem(all[0] ?? null);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selectedItem) return;
    const controller = new AbortController();
    setExplanation(undefined);
    fetchAssessmentExplanation(selectedItem.household_id, controller.signal).then(setExplanation)
      .catch(() => { if (!controller.signal.aborted) setExplanation(null); });
    return () => controller.abort();
  }, [selectedItem]);
  const reviewed = Object.keys(auditDecisionMap).length;

  const handleDecision = (id: string, decision: 'CERTIFIED' | 'DISALLOWANCE_FLAG') => {
    setAuditDecisionMap(prev => ({ ...prev, [id]: decision }));
  };

  const filteredItems = items.filter(item => 
    item.household_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.head_of_household.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.address.municipality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="module-page sampling-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">PERSONA 3: COA Evidentiary Sampling & Third-Party Cross-Audit</span>
            <span className="ml-2">Independent State Auditor Cross-Examination Module</span>
          </div>
          <div>coa-sampling-ledger.json</div>
        </div>
      )}

      {/* Header */}
      <div className="module-heading">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-mono">
              INDEPENDENT COA RECONCILIATION
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1 font-display">
            Audit Sampling
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Cross-examine each model-flagged household against its trigger evidence and the sealed model explanation in the audit ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto w-full sm:w-auto">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search PhilSys, Household ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#13233f] bg-white w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Split View: Sample List (Left) + Detailed Audit Cross-Examination Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Sample Items List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 bg-stone-50/70 border-b border-stone-200/90 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-900 font-display">
              Auditor Sampling Queue ({filteredItems.length})
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              {reviewed} reviewed this session
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-[360px] lg:max-h-[600px] overflow-y-auto" aria-busy={loading}>
            {loading && <p role="status" className="p-4 text-xs text-stone-500">Loading flagged households…</p>}
            {error && <p role="alert" className="p-4 text-xs text-rose-800">{error}</p>}
            {!loading && !error && items.length === 0 && <p role="status" className="p-4 text-xs text-stone-500">No flagged households to sample.</p>}
            {filteredItems.map((item) => {
              const decision = auditDecisionMap[item.household_id];
              const isSelected = selectedItem?.household_id === item.household_id;

              return (
                <div
                  key={item.household_id}
                  role="button" tabIndex={0} aria-pressed={isSelected}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedItem(item); } }}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-stone-100/90 border-l-3 border-l-[#13233f]' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#13233f]">{item.household_id}</span>
                      <span className="text-stone-300">·</span>
                      <span className="font-semibold text-xs text-stone-900 truncate">
                        {item.head_of_household.full_name}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                      <span>{item.address.barangay}, {item.address.municipality}</span>
                      <span className="font-mono text-stone-600 font-semibold">
                        Score: {item.composite_risk_score}
                      </span>
                    </div>

                    {decision && (
                      <div className="mt-1.5 flex items-center gap-1">
                        {decision === 'CERTIFIED' ? (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            ✓ COA Certified Compliant
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            ⚠ Flagged for Disallowance
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Cross-Examination Dossier (7 Cols) */}
        {selectedItem && <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200/90 shadow-2xs p-4 sm:p-6 space-y-5 min-w-0">
          
          {/* Dossier Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
            <div>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-mono font-bold text-base text-[#13233f]">
                  {selectedItem.household_id}
                </span>
                <span className="text-stone-300">|</span>
                <span className="text-base font-bold text-stone-900 font-display">
                  {selectedItem.head_of_household.full_name}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                PhilSys: {selectedItem.head_of_household.national_id} · Location: {selectedItem.address.barangay}, {selectedItem.address.municipality}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                Severity: {selectedItem.severity}
              </span>
            </div>
          </div>

          {/* Third-Party Cross-Match Verification Matrix */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Government Registry Reconciliations
            </h4>

            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="font-semibold text-stone-900">Status and score</span>
                <span className="font-mono font-semibold text-rose-700">{selectedItem.composite_risk_score} / 100</span>
              </div>
              <p className="text-[11px] text-stone-500">
                {selectedItem.status.replace(/_/g, ' ')} · enrolled {selectedItem.enrolled_swdi_level} · model predicts {selectedItem.predicted_swdi_level}
              </p>
            </div>
            {selectedItem.trigger_badges.map((badge, index) => (
              <div key={`${badge.type}-${index}`} className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-stone-900">{index + 1}. {badge.label}</span>
                  <span className={`font-mono font-semibold ${badge.severity === 'danger' ? 'text-rose-700' : badge.severity === 'warning' ? 'text-amber-700' : 'text-stone-600'}`}>{badge.type}</span>
                </div>
                {badge.detail !== badge.label && <p className="text-[11px] text-stone-500">{badge.detail}</p>}
              </div>
            ))}
            {selectedItem.trigger_badges.length === 0 && <p className="text-[11px] text-stone-500">No external-registry trigger was recorded for this household.</p>}
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5">
              <div className="text-xs font-semibold text-stone-900">Sealed model explanation</div>
              {explanation === undefined && <p className="text-[11px] text-stone-500">Loading…</p>}
              {explanation === null && <p className="text-[11px] text-stone-500">No sealed assessment exists for this household yet.</p>}
              {explanation && <>
                <p className="text-[11px] text-stone-500">
                  {explanation.evaluation_mode === 'ML_MODEL' ? 'Model' : 'Fallback rules'} · sealed {displayDateTime(explanation.sealed_at)} · ledger block #{explanation.audit_receipt.sequence_index}
                </p>
                <ul className="text-[11px] text-stone-600 space-y-0.5">
                  {explanation.shap_explainability.slice(0, 5).map(s => (
                    <li key={s.indicator} className="flex justify-between gap-2"><span className="min-w-0">{s.description || s.indicator}</span><span className="font-mono shrink-0">{s.contribution_weight > 0 ? '+' : ''}{s.contribution_weight.toFixed(3)}</span></li>
                  ))}
                </ul>
              </>}
            </div>
          </div>

          {/* Auditor Determination & Certification Actions */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 font-display">
              Certification Preview
            </h4>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                id="coa-certify-compliant-btn"
                onClick={() => handleDecision(selectedItem.household_id, 'CERTIFIED')}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Preview Certification</span>
              </button>

              <button
                id="coa-flag-disallowance-btn"
                onClick={() => handleDecision(selectedItem.household_id, 'DISALLOWANCE_FLAG')}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Preview Disallowance Flag</span>
              </button>
            </div>

            <p className="text-[11px] text-stone-400 italic text-center">
              Preview only. No decision is saved or added to the audit trail.
            </p>
          </div>

        </div>}

      </div>

    </div>
  );
};
