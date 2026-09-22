import React, { useState } from 'react';
import { DueProcessNoticeItem } from '../../types/contracts';
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
}

export const Screen5DueProcessManager: React.FC<Screen5DueProcessManagerProps> = ({
  showSpecAnnotations = false,
}) => {
  const [notices, setNotices] = useState<DueProcessNoticeItem[]>(MOCK_DUE_PROCESS_NOTICES);
  const [selectedNoticeForAppeal, setSelectedNoticeForAppeal] = useState<DueProcessNoticeItem | null>(null);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);

  // Appeal Docket Modal Inputs
  const [appealDocketId, setAppealDocketId] = useState('APP-CAL-2026-0089');
  const [hearingDate, setHearingDate] = useState('2026-10-08');
  const [appealGrounds, setAppealGrounds] = useState(
    'Unauthorized power line tapping by informal neighbor verified by Barangay Certificate; motorcycle registered to separated relative not resident in household.'
  );

  const handleOpenAppealModal = (item: DueProcessNoticeItem) => {
    setSelectedNoticeForAppeal(item);
    setAppealDocketId(`APP-${item.address.municipality.substring(0, 3).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setIsAppealModalOpen(true);
  };

  const handleConfirmAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoticeForAppeal) return;

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
  };

  // Helper calculation for 15-day countdown
  const getRemainingDaysAndHours = (expiryDateStr: string, isPaused: boolean) => {
    if (isPaused) {
      return { days: 0, hours: 0, text: 'Paused Pending Evidentiary Hearing', progressPct: 60 };
    }
    const expiry = new Date(expiryDateStr).getTime();
    const now = new Date('2026-09-21T10:00:00').getTime();
    const diffMs = expiry - now;

    if (diffMs <= 0) {
      return { days: 0, hours: 0, text: 'Notice Expired (De-listing Finalized)', progressPct: 100 };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const progressPct = Math.min(100, Math.max(0, Math.round(((15 - days) / 15) * 100)));

    return {
      days,
      hours,
      text: `${days} Days, ${hours} Hours Remaining`,
      progressPct
    };
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-7xl mx-auto">
      
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

      {/* Screen Title */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight font-display">
              Due Process & Appeals Manager
            </h2>
            <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
              {notices.length} Active Dockets
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
            Under Section 12 of RA 11310, cash transfers cannot be terminated without serving formal Notice of Ineligibility and providing a 15-day statutory appeal window.
          </p>
        </div>

        {/* Global Legal Shield Badge - Unboxed Clean Design */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/80 self-start md:self-auto shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Statutory Protection Enforced</span>
        </div>
      </div>

      {/* 1. Countdown Card List */}
      <div className="space-y-4">
        {notices.map((notice) => {
          const isUnderAppeal = notice.status === 'UNDER_APPEAL_HEARING';
          const countdown = getRemainingDaysAndHours(notice.notice_expiry_date, isUnderAppeal);

          return (
            <div
              key={notice.household_id}
              id={`due-process-card-${notice.household_id}`}
              className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 hover:border-stone-300 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                {/* Left: Beneficiary & Notice Basis */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#132e4f]">
                      {notice.household_id}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="font-bold text-stone-900 text-sm font-display">
                      {notice.head_of_household.full_name}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/70">
                      PhilSys: {notice.head_of_household.national_id}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500">
                    Jurisdiction: {notice.address.barangay}, {notice.address.municipality} (Laguna Pilot)
                  </div>

                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 text-xs text-stone-700 mt-2">
                    <span className="font-semibold text-stone-800">Grounds for Notice: </span>
                    <span>{notice.initial_ineligibility_cause}</span>
                  </div>

                  {/* If appeal is already filed */}
                  {isUnderAppeal && (
                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 text-xs text-stone-800 mt-2">
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className="flex items-center gap-1.5 text-[#132e4f]">
                          <Scale className="w-3.5 h-3.5 text-[#132e4f]" />
                          <span className="font-mono">Docket: {notice.appeal_docket_id}</span>
                        </span>
                        <span className="text-[11px] text-stone-600 font-mono">Hearing Date: {notice.hearing_date}</span>
                      </div>
                      <p className="text-xs text-stone-600 italic">
                        &quot;{notice.appeal_grounds}&quot;
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Visual 15-Day Countdown Timer & Actions */}
                <div className="lg:w-84 shrink-0 bg-stone-50 p-4 rounded-xl border border-stone-200/80 flex flex-col justify-between space-y-3">
                  
                  {/* Status Indicator - Clean Unboxed */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        isUnderAppeal ? 'bg-[#132e4f]' : 'bg-amber-600'
                      }`} />
                      <span className="text-[11px] font-semibold text-stone-800">
                        {isUnderAppeal ? 'Under Appeal Hearing' : 'Notice of Ineligibility'}
                      </span>
                    </div>

                    {notice.grant_continuation_active && (
                      <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        Grants Protected
                      </span>
                    )}
                  </div>

                  {/* Countdown Timer Display */}
                  <div>
                    <div className="flex items-center space-x-1.5 text-stone-500 text-[11px] mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span className="font-medium">15-Day Statutory Countdown</span>
                    </div>

                    <div className="text-sm font-bold text-stone-900 font-mono flex items-center justify-between">
                      <span>{countdown.text}</span>
                      {isUnderAppeal && <PauseCircle className="w-4 h-4 text-[#132e4f]" />}
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isUnderAppeal ? 'bg-[#132e4f]' : 'bg-amber-600'
                        }`}
                        style={{ width: `${countdown.progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1.5">
                      <span>Served: {notice.notice_date}</span>
                      <span>Expires: {notice.notice_expiry_date}</span>
                    </div>
                  </div>

                  {/* Action Button: File Formal Appeal */}
                  <div className="pt-2 border-t border-stone-200/80">
                    {isUnderAppeal ? (
                      <div className="text-center text-xs font-medium text-[#132e4f] py-1.5 bg-white rounded-lg border border-stone-200">
                        ✓ Statutory Clock Suspended for Hearing
                      </div>
                    ) : (
                      <button
                        id={`file-appeal-btn-${notice.household_id}`}
                        onClick={() => handleOpenAppealModal(notice)}
                        className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>File Formal Appeal Docket</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Appeal Docket Modal */}
      {isAppealModalOpen && selectedNoticeForAppeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200/90 w-full max-w-lg overflow-hidden transition-all">
            
            <div className="bg-stone-50/70 border-b border-stone-200/90 p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#132e4f] text-white rounded-lg shadow-2xs">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 font-display">
                    File Statutory Appeal Docket
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Suspends the 15-day graduation countdown pending evidentiary hearing
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAppealModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAppeal} className="p-6 space-y-4 text-xs text-stone-800">
              
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-1">
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Appellant Beneficiary</span>
                <div className="font-semibold text-stone-900 text-sm font-display">
                  {selectedNoticeForAppeal.head_of_household.full_name} ({selectedNoticeForAppeal.household_id})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Appeal Docket Reference
                </label>
                <input
                  type="text"
                  required
                  value={appealDocketId}
                  onChange={(e) => setAppealDocketId(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#132e4f] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Evidentiary Hearing Date
                </label>
                <input
                  type="date"
                  required
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#132e4f] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Formal Grounds & Rebuttal Arguments
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealGrounds}
                  onChange={(e) => setAppealGrounds(e.target.value)}
                  placeholder="State evidence details (e.g., Barangay certification, unauthorized tapping, livelihood asset use)..."
                  className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#132e4f] outline-none leading-relaxed"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                <span className="font-semibold">Legal Consequence:</span> Submitting this docket immediately pauses the automatic 15-day timer and continues grant disbursements until hearing conclusion.
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end space-x-3">
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
                  className="px-4 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>File Docket & Suspend Timer</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
