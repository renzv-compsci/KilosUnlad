import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, ShieldAlert, X } from 'lucide-react';
import { AccessibleDialog } from '../common/AccessibleDialog';
import { displayDate, displayDateTime } from '../../utils/displayDate';
import { fetchEvidenceUrl, fetchTaskReport, issueNotice, NoticeReceipt, resolutionErrorMessage, retainHousehold, RetentionReceipt, TaskReport } from '../../services/api';

const RECOMMENDATIONS: Record<string, string> = {
  RECOMMEND_GRADUATION: 'Recommend graduation', RETAIN: 'Retain on the program', INVESTIGATE_FRAUD: 'Investigate possible fraud',
};
const yesNo = (value?: boolean) => value === undefined ? '—' : value ? 'Yes' : 'No';

// One evidence photo, fetched with the session and verified by the server before it is shown.
const EvidencePhoto: React.FC<{ hash: string; capturedAt: string | null }> = ({ hash, capturedAt }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    fetchEvidenceUrl(hash, controller.signal).then(u => { objectUrl = u; setUrl(u); })
      .catch(failure => { if (!controller.signal.aborted) setError(resolutionErrorMessage(failure)); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [hash]);
  return (
    <figure className="evidence-photo">
      {url ? <img src={url} alt={`Field evidence photo, SHA-256 ${hash.slice(0, 12)}…`} /> :
        <div className="evidence-placeholder" role={error ? 'alert' : 'status'}>{error || 'Loading photo…'}</div>}
      <figcaption>{url && <><FileCheck2 size={13} aria-hidden="true" /> Hash verified · </>}{displayDateTime(capturedAt)}<br /><code>{hash.slice(0, 16)}…</code></figcaption>
    </figure>
  );
};

interface Props { taskId: string; canDecide: boolean; onClose: () => void; onDecided: (receipt: NoticeReceipt | RetentionReceipt) => void }

// DECISION-011: the director reviews the submitted field report and, when it supports
// graduation, issues the Notice of Ineligibility (15-day appeal window; grants continue).
// DECISION-012: when it supports retention, the director keeps the household on the program.
export const ReportReviewDialog: React.FC<Props> = ({ taskId, canDecide, onClose, onDecided }) => {
  const [report, setReport] = useState<TaskReport | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<NoticeReceipt | null>(null);
  const [kept, setKept] = useState<RetentionReceipt | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchTaskReport(taskId, controller.signal).then(setReport)
      .catch(failure => { if (!controller.signal.aborted) setLoadError(resolutionErrorMessage(failure)); });
    return () => controller.abort();
  }, [taskId]);
  const decidable = canDecide && report?.task_status === 'SUBMITTED';
  const decide = async (choice: 'notice' | 'retain') => {
    if (pending || !report) return;
    setPending(true); setError('');
    try {
      if (choice === 'notice') { const result = await issueNotice(report.task_id, notes.trim()); setReceipt(result); onDecided(result); }
      else { const result = await retainHousehold(report.task_id, notes.trim()); setKept(result); onDecided(result); }
    } catch (failure) { setError(resolutionErrorMessage(failure)); }
    finally { setPending(false); }
  };
  const submit = (event: React.FormEvent) => { event.preventDefault(); void decide(report?.graduation_supported ? 'notice' : 'retain'); };
  const f = report?.findings;
  return (
    <AccessibleDialog titleId="report-dialog-title" onClose={() => { if (!pending) onClose(); }}
      className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 flex items-center justify-center p-4">
      <div className="report-dialog bg-white rounded-lg shadow-xl border border-stone-200 w-full max-w-3xl overflow-hidden">
        <header className="flex items-center justify-between gap-4 p-5 border-b border-stone-200">
          <div className="min-w-0">
            <h3 id="report-dialog-title" className="text-lg font-semibold text-[#132e4f]">Field report review</h3>
            {report && <p className="text-sm text-stone-600">{report.head_of_household.full_name} · {report.household_id} · {report.address.barangay}, {report.address.municipality}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close report" className="p-2 rounded hover:bg-stone-100"><X size={20} /></button>
        </header>
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {loadError && <p role="alert" className="text-sm text-rose-800">{loadError}</p>}
          {!report && !loadError && <p role="status" className="text-sm text-stone-500">Loading the report…</p>}
          {report && f && <>
            <dl className="report-facts">
              <div><dt>Caseworker</dt><dd>{report.assigned_worker?.full_name ?? '—'}</dd></div>
              <div><dt>Submitted</dt><dd>{displayDateTime(report.submitted_at)}</dd></div>
              <div><dt>Verified SWDI level</dt><dd>{f.verified_swdi_level ? `Level ${f.verified_swdi_level}` : '—'}</dd></div>
              <div><dt>Recommendation</dt><dd>{RECOMMENDATIONS[f.worker_recommendation ?? ''] ?? '—'}</dd></div>
              <div><dt>Vehicle present / productive</dt><dd>{yesNo(f.livelihood_asset_verification?.is_motorcycle_present)} / {yesNo(f.livelihood_asset_verification?.is_productive_asset)}</dd></div>
              <div><dt>Cash card held by beneficiary</dt><dd>{yesNo(f.landbank_card_inspection?.physical_card_presented)}{f.landbank_card_inspection?.pawning_suspected ? ' · pawning suspected' : ''}</dd></div>
              <div><dt>Visit location</dt><dd>{f.client_geolocation ? `${f.client_geolocation.latitude.toFixed(5)}, ${f.client_geolocation.longitude.toFixed(5)} (±${f.client_geolocation.accuracy_meters ?? '?'} m)` : '—'}</dd></div>
              <div><dt>Status</dt><dd>{report.task_status.replace(/_/g, ' ').toLowerCase()} · household {report.household_status.replace(/_/g, ' ').toLowerCase()}</dd></div>
            </dl>
            {f.narrative_report && <p className="text-sm text-stone-700"><strong>Narrative:</strong> {f.narrative_report}</p>}
            <section aria-label="Evidence photos">
              <h4 className="text-sm font-semibold text-[#132e4f] mb-2">Evidence photos ({report.evidence.length})</h4>
              {report.evidence.length === 0 ? <p className="text-sm text-stone-500">No photos were attached.</p> :
                <div className="evidence-grid">{report.evidence.map(e => <EvidencePhoto key={e.sha256_hash} hash={e.sha256_hash} capturedAt={e.captured_at} />)}</div>}
            </section>
            {report.admin_resolution && <p className="preview-note">Decided: {report.admin_resolution.decision.replace(/_/g, ' ').toLowerCase()} on {displayDate(report.admin_resolution.finalized_at)}. Grounds: {report.admin_resolution.admin_notes}</p>}
            {receipt ? <div role="status" className="space-y-1 text-sm">
              <p className="flex items-center gap-2 text-emerald-800 font-semibold"><CheckCircle2 size={18} aria-hidden="true" />Notice of Ineligibility issued and sealed in the ledger.</p>
              <p>Appeal window: {displayDateTime(receipt.notice_date)} to <strong>{displayDateTime(receipt.appeal_deadline)}</strong>. Grants continue meanwhile. Ledger block #{receipt.audit_receipt.sequence_index}.</p>
            </div> : kept ? <div role="status" className="space-y-1 text-sm">
              <p className="flex items-center gap-2 text-emerald-800 font-semibold"><CheckCircle2 size={18} aria-hidden="true" />Household kept on the program and sealed in the ledger.</p>
              <p>Status is back to active and compliant. The model will not re-flag it before <strong>{displayDate(kept.reassessment_allowed_from)}</strong>. Ledger block #{kept.audit_receipt.sequence_index}.</p>
            </div> : decidable && (report.graduation_supported || report.retention_supported ? (
              <form onSubmit={submit} className="space-y-3 border-t border-stone-200 pt-4" aria-busy={pending}>
                <label htmlFor="notice-grounds" className="block text-sm font-semibold text-stone-800">Grounds for your decision
                  <textarea id="notice-grounds" required minLength={10} maxLength={1000} rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-stone-300 rounded-lg text-sm font-normal"
                    placeholder={report.graduation_supported ? 'e.g. Field visit confirmed Level 3: private sedan and a household business.' : 'e.g. Field visit confirmed Level 2: no vehicle, irregular income.'} />
                </label>
                <p className="text-xs text-stone-600">
                  {report.graduation_supported && 'Issuing a notice starts the 15-day appeal window; grants continue until it ends with no appeal. '}
                  {report.retention_supported && 'Keeping the household returns it to active status; the model will not re-flag it for 180 days.'}
                </p>
                {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  {report.graduation_supported && <button id="issue-notice-btn" type="button" onClick={() => void decide('notice')} disabled={pending || notes.trim().length < 10} className="primary-triage-action disabled:opacity-50">
                    {pending ? 'Saving…' : 'Approve graduation and issue notice'}
                  </button>}
                  {report.retention_supported && <button id="retain-household-btn" type="button" onClick={() => void decide('retain')} disabled={pending || notes.trim().length < 10} className={`${report.graduation_supported ? 'record-action' : 'primary-triage-action'} disabled:opacity-50`}>
                    {pending ? 'Saving…' : 'Keep on the program'}
                  </button>}
                </div>
              </form>
            ) : <p className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <ShieldAlert size={18} aria-hidden="true" className="shrink-0" />The field report neither supports graduation nor retention (no recommendation and no verified level), so order a new visit.</p>)}
          </>}
        </div>
      </div>
    </AccessibleDialog>
  );
};
