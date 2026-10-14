import React, { useCallback, useEffect, useState } from 'react';
import { AccessibleDialog } from '../common/AccessibleDialog';
import { SampleDataLabel } from '../common/SampleDataLabel';
import { displayDate, displayDateTime } from '../../utils/displayDate';
import { noticeCountdown, sortDueProcessNotices } from '../../utils/dueProcessPresentation';
import { AppealFilingReceipt, AppealFilingRequest, DueProcessNoticeItem } from '../../types/contracts';
import { MOCK_DUE_PROCESS_NOTICES } from '../../data/mockContracts';
import { 
  Clock, 
  ShieldCheck, 
  Scale, 
  CheckCircle2, 
  PauseCircle,
  X,
  FileCheck
} from 'lucide-react';

interface Screen5DueProcessManagerProps {
  showSpecAnnotations?: boolean;
  // INT-08: when both are supplied the screen is live (real notices, real filing).
  loadDocket?: (signal: AbortSignal) => Promise<DueProcessNoticeItem[]>;
  submitAppeal?: (body: AppealFilingRequest) => Promise<AppealFilingReceipt>;
  describeError?: (error: unknown) => string;
  // DECISION-011: completes graduation once the 15-day window has passed with no appeal.
  completeGraduation?: (householdId: string) => Promise<{ household_id: string; audit_receipt: { sequence_index: number } }>;
}

const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

export const Screen5DueProcessManager: React.FC<Screen5DueProcessManagerProps> = ({
  showSpecAnnotations = false, loadDocket, submitAppeal, describeError, completeGraduation,
}) => {
  const [graduating, setGraduating] = useState<string | null>(null);
  const live = Boolean(loadDocket && submitAppeal);
  const [notices, setNotices] = useState<DueProcessNoticeItem[]>(live ? [] : MOCK_DUE_PROCESS_NOTICES);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(live ? 'loading' : 'ready');
  const [isFiling, setIsFiling] = useState(false);
  const [filingError, setFilingError] = useState<string | null>(null);
  const [filedMessage, setFiledMessage] = useState<string | null>(null);

  const reload = useCallback(async (signal: AbortSignal) => {
    if (!loadDocket) return;
    setLoadState('loading');
    try {
      const items = await loadDocket(signal);
      if (!signal.aborted) { setNotices(items); setLoadState('ready'); }
    } catch {
      if (!signal.aborted) setLoadState('error');
    }
  }, [loadDocket]);

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [live, reload]);
  const [selectedNoticeForAppeal, setSelectedNoticeForAppeal] = useState<DueProcessNoticeItem | null>(null);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [previewUpdated, setPreviewUpdated] = useState(false);

  // Appeal Docket Modal Inputs
  const [appealDocketId, setAppealDocketId] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [appealGrounds, setAppealGrounds] = useState('');

  const handleOpenAppealModal = (item: DueProcessNoticeItem) => {
    setSelectedNoticeForAppeal(item);
    setAppealDocketId('');
    setHearingDate('');
    setAppealGrounds('');
    setIsAppealModalOpen(true);
  };

  const handleConfirmAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoticeForAppeal) return;
    if (live && submitAppeal) {
      setIsFiling(true);
      setFilingError(null);
      try {
        const receipt = await submitAppeal({ household_id: selectedNoticeForAppeal.household_id,
          appeal_docket_id: appealDocketId.trim(), hearing_date: hearingDate, appeal_grounds: appealGrounds.trim() });
        setIsAppealModalOpen(false);
        setFiledMessage(`Appeal filed: ${receipt.appeal_docket_id} for ${receipt.household_id}. Countdown paused; sealed in audit block #${receipt.audit_receipt.sequence_index}.`);
        await reload(new AbortController().signal);
      } catch (error) {
        setFilingError(describeError ? describeError(error) : 'The appeal could not be filed.');
      } finally {
        setIsFiling(false);
      }
      return;
    }

    // Update notice to UNDER_APPEAL_HEARING and pause countdown
    setNotices((prev) =>
      prev.map((n) =>
        n.household_id === selectedNoticeForAppeal.household_id
          ? {
              ...n,
              status: 'UNDER_APPEAL_HEARING',
              appeal_docket_id: appealDocketId,
              hearing_date: hearingDate,
              appeal_grounds: appealGrounds
            }
          : n
      )
    );

    setIsAppealModalOpen(false);
    setPreviewUpdated(true);
  };

  return (
    <div className="module-page due-process-page operations-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">SCREEN 5: 15-Day Appeal & Due Process Manager</span>
            <span className="ml-2">RA 11310 Sec. 12 (Mandatory 15-Day Evidentiary Notice Period)</span>
          </div>
          <div>admin-due-process.json</div>
        </div>
      )}

      <header className="module-heading">
        <div>
          {!live && <SampleDataLabel />}
          <h2>15-Day Due Process</h2>
          <p>{live ? 'Upcoming deadlines first. Households under a Notice of Ineligibility in your jurisdiction.' : 'Upcoming deadlines first. Sample timeline: Sep 21, 2026, 10:00 AM PHT.'}</p>
        </div>
        <span className="quiet-count">{notices.length} active dockets</span>
      </header>

      <div className="process-summary" aria-label="Docket summary">
        <span><strong>{notices.filter((notice) => notice.status !== 'UNDER_APPEAL_HEARING').length}</strong> Notice issued</span>
        <span><strong>{notices.filter((notice) => notice.status === 'UNDER_APPEAL_HEARING').length}</strong> Under appeal</span>
      </div>
      {previewUpdated && <p role="status" className="preview-note">Preview updated only. No appeal was filed and no official deadline was changed.</p>}
      {filedMessage && <p role="status" className="preview-note">{filedMessage}</p>}
      {live && loadState === 'loading' && <p role="status" className="preview-note">Loading the due process docket…</p>}
      {live && loadState === 'error' && <p role="alert" className="preview-note">The due process docket could not be loaded. Try again later.</p>}
      {live && loadState === 'ready' && notices.length === 0 && <p role="status" className="preview-note">No households are under a Notice of Ineligibility in your jurisdiction.</p>}

      <section className="operations-records" aria-label="Due process notices">
        {sortDueProcessNotices(notices).map((notice) => {
          const isUnderAppeal = notice.status === 'UNDER_APPEAL_HEARING';
          const countdown = live
            ? noticeCountdown(notice.notice_expiry_date ?? '', isUnderAppeal, new Date().toISOString())
            : noticeCountdown(notice.notice_expiry_date ?? '', isUnderAppeal);
          return (
            <article key={notice.household_id} id={`due-process-card-${notice.household_id}`} className={`operations-record process-record ${countdown.urgent ? 'record-urgent' : ''}`}>
              <div className="record-main">
                <h3>{notice.head_of_household.full_name}</h3>
                <p className="record-location">{notice.address.barangay}, {notice.address.municipality}</p>
                <details className="record-details">
                  <summary>Notice &amp; appeal details</summary>
                  <dl>
                    <div><dt>Household</dt><dd>{notice.household_id}</dd></div>
                    <div><dt>PhilSys</dt><dd>{notice.head_of_household.national_id}</dd></div>
                    <div><dt>Notice served</dt><dd><time dateTime={notice.notice_date ?? undefined} title={notice.notice_date ?? undefined}>{displayDate(notice.notice_date)}</time></dd></div>
                    <div><dt>Notice expires</dt><dd><time dateTime={notice.notice_expiry_date ?? undefined} title={notice.notice_expiry_date ?? undefined}>{displayDate(notice.notice_expiry_date)}</time></dd></div>
                  </dl>
                  <p><strong>Grounds for notice:</strong> {notice.initial_ineligibility_cause}</p>
                  {isUnderAppeal && <>
                    <dl>
                      <div><dt>Appeal docket</dt><dd>{notice.appeal_docket_id}</dd></div>
                      <div><dt>Hearing date</dt><dd>{displayDate(notice.hearing_date)}</dd></div>
                    </dl>
                    <p><strong>Appeal grounds:</strong> {notice.appeal_grounds}</p>
                  </>}
                </details>
              </div>
              <div className="record-status">
                <span className="quiet-status">{isUnderAppeal ? 'Under appeal hearing' : 'Notice of ineligibility'}</span>
                <span className={`countdown-label ${countdown.urgent ? 'is-urgent' : ''}`}>
                  {isUnderAppeal ? <PauseCircle size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
                  {countdown.text}
                </span>
                <span className="record-date-label">{isUnderAppeal ? 'Hearing ' : 'Deadline '}<time dateTime={(isUnderAppeal ? notice.hearing_date : notice.notice_expiry_date) ?? undefined}>{displayDateTime(isUnderAppeal ? notice.hearing_date : notice.notice_expiry_date)}</time></span>
                {notice.grant_continuation_active && <span className="protected-label"><ShieldCheck size={14} aria-hidden="true" />Grants protected</span>}
              </div>
              <div className="record-action-area">
                {!isUnderAppeal && <button id={`file-appeal-btn-${notice.household_id}`} onClick={() => handleOpenAppealModal(notice)} className="record-action"><Scale size={16} aria-hidden="true" />{live ? 'File Appeal' : 'Preview Appeal'}</button>}
                {live && completeGraduation && !isUnderAppeal && notice.notice_expiry_date && Date.parse(notice.notice_expiry_date) <= Date.now() &&
                  <button id={`graduate-btn-${notice.household_id}`} type="button" disabled={graduating !== null} className="record-action" onClick={async () => {
                    setGraduating(notice.household_id); setFilingError(null); setFiledMessage(null);
                    try {
                      const receipt = await completeGraduation(notice.household_id);
                      setFiledMessage(`${notice.head_of_household.full_name} graduated: the appeal window ended with no appeal. Sealed as ledger block #${receipt.audit_receipt.sequence_index}.`);
                      const controller = new AbortController(); await reload(controller.signal);
                    } catch (failure) { setFiledMessage(describeError ? describeError(failure) : 'Graduation could not be completed.'); }
                    finally { setGraduating(null); }
                  }}><CheckCircle2 size={16} aria-hidden="true" />{graduating === notice.household_id ? 'Completing…' : 'Complete graduation'}</button>}
              </div>
            </article>
          );
        })}
      </section>
      <details className="context-details">
        <summary>Statutory protection &amp; appeal rules</summary>
        <p>Under Section 12 of RA 11310, cash transfers cannot be terminated without serving formal Notice of Ineligibility and providing a 15-day statutory appeal window. A filed appeal suspends the statutory clock pending evidentiary hearing.</p>
      </details>

      {/* 2. Appeal Docket Modal */}
      {isAppealModalOpen && selectedNoticeForAppeal && (
        <AccessibleDialog titleId="appeal-dialog-title" onClose={() => setIsAppealModalOpen(false)} className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="dialog-sheet bg-white rounded-xl shadow-xl border border-stone-200/90 w-full max-w-lg">
            
            <div className="bg-stone-50/70 border-b border-stone-200/90 p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#132e4f] text-white rounded-lg shadow-2xs">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="appeal-dialog-title" className="text-base font-bold text-stone-900 font-display">
                    {live ? 'File Formal Appeal' : 'Appeal Preview'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {live ? 'Recorded in the sealed audit ledger; pauses the 15-day countdown' : 'Sample docket; no official filing'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAppealModalOpen(false)}
                aria-label="Close appeal dialog"
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAppeal} className="dialog-form text-sm text-stone-800">
              <div className="dialog-body space-y-4">
              
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-1">
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Appellant Beneficiary</span>
                <div className="font-semibold text-stone-900 text-sm font-display">
                  {selectedNoticeForAppeal.head_of_household.full_name} ({selectedNoticeForAppeal.household_id})
                </div>
              </div>

              <div>
                <label htmlFor="appeal-reference" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Appeal Docket Reference <span className="required-label">(required)</span>
                </label>
                <input id="appeal-reference"
                  type="text"
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9\-]{2,63}"
                  title="3-64 letters, digits or hyphens"
                  disabled={isFiling}
                  value={appealDocketId}
                  onChange={(e) => setAppealDocketId(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#132e4f] outline-none"
                />
              </div>

              <div>
                <label htmlFor="appeal-hearing" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Evidentiary Hearing Date <span className="required-label">(required)</span>
                </label>
                <input id="appeal-hearing"
                  type="date"
                  required
                  min={live ? manilaToday() : undefined}
                  disabled={isFiling}
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#132e4f] outline-none"
                />
              </div>

              <div>
                <label htmlFor="appeal-grounds" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Formal Grounds & Rebuttal Arguments <span className="required-label">(required)</span>
                </label>
                <textarea id="appeal-grounds"
                  rows={4}
                  required
                  value={appealGrounds}
                  onChange={(e) => setAppealGrounds(e.target.value)}
                  placeholder="State evidence details (e.g., Barangay certification, unauthorized tapping, livelihood asset use)..."
                  className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#132e4f] outline-none leading-relaxed"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                {live
                  ? <><span className="font-semibold">Official filing:</span> This registers the appeal, pauses the countdown and is sealed as an APPEAL_FILED audit block. It cannot be undone from this screen.</>
                  : <><span className="font-semibold">Preview only:</span> This updates the sample on this page. It does not file an appeal, change an official deadline, or affect grant payments.</>}
                {filingError && <p role="alert" className="mt-2 text-rose-800">{filingError}</p>}
              </div>

              </div>
              <footer className="dialog-footer">
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium text-xs hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-appeal-docket-btn"
                  type="submit"
                  disabled={isFiling}
                  className="px-4 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{live ? (isFiling ? 'Filing appeal…' : 'File Appeal') : 'Preview Appeal Status'}</span>
                </button>
              </footer>

            </form>

          </div>
        </AccessibleDialog>
      )}

    </div>
  );
};
