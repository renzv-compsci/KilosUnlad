import React, { useEffect, useState } from 'react';
import { 
  Scale, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  FileCheck2, 
  ChevronRight, 
  CheckCircle2, 
  UserCheck, 
  Users,
  Search,
  ExternalLink
} from 'lucide-react';
import type { ScreenId } from '../../types/navigation';
import { apiErrorMessage, fetchDueProcessDocket } from '../../services/api';
import { displayDate } from '../../utils/displayDate';
import { DueProcessNoticeItem } from '../../types/contracts';

interface GrievanceAppealsDashboardProps {
  onNavigateToScreen: (screenId: ScreenId) => void;
  showSpecAnnotations?: boolean;
}

export const GrievanceAppealsDashboard: React.FC<GrievanceAppealsDashboardProps> = ({
  onNavigateToScreen,
  showSpecAnnotations = false
}) => {
  const [notices, setNotices] = useState<DueProcessNoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchDueProcessDocket(controller.signal).then(setNotices)
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const hearings = notices.filter(n => n.hearing_date && n.hearing_date.slice(0, 10) >= today)
    .sort((a, b) => String(a.hearing_date).localeCompare(String(b.hearing_date)));
  const revokedCount = notices.filter(n => n.status === 'FINAL_REVOCATION').length;

  const activeNoticesCount = notices.filter(n => n.status === 'NOTICE_OF_INELIGIBILITY').length;
  const underAppealCount = notices.filter(n => n.status === 'UNDER_APPEAL_HEARING').length;

  return (
    <div className="module-page appeals-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">CHAPTER 04: Case Worker Persona 2 — Grievance & Appeals Dashboard</span>
            <span className="ml-2">RA 11310 Sec. 12 (Statutory Right to Appeal & Due Process)</span>
          </div>
          <div>GPO-01 · admin-due-process.json</div>
        </div>
      )}

      {/* Screen Title & Statutory Shield Header */}
      <div className="module-heading">
        <div>
          <div className="flex items-center space-x-2.5">
          <h2 className="text-xl font-bold text-stone-900 tracking-tight font-display">
              Grievance & Statutory Appeals Division
            </h2>
            <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
              Your jurisdiction
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
            Live due-process docket. Enforces Section 12 of Republic Act 11310: Beneficiaries cannot be de-listed without 15-day statutory notice and access to formal evidentiary appeal.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/80 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Due Process Protection Enforced</span>
        </div>
      </div>

      {/* 4 Stat Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Active 15-Day Notices</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-stone-900 font-display mt-2">{activeNoticesCount}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">Countdown clock running</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Under Evidentiary Hearing</span>
            <Scale className="w-4 h-4 text-[#13233f]" />
          </div>
          <div className="text-3xl font-black text-stone-900 font-display mt-2">{underAppealCount}</div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium">15-day countdown paused</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Hearings Scheduled</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-stone-900 font-display mt-2">{hearings.length}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">Today or later</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Appeal Window Elapsed</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-stone-900 font-display mt-2">{revokedCount}</div>
          <div className="text-[11px] text-stone-500 mt-1 font-medium">No appeal filed within 15 days</div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Due Process Dockets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 font-display">
                Active Due Process & Appeal Dockets
              </h3>
              <p className="text-xs text-stone-500">
                Statutory cases requiring evidentiary review or hearing coordination
              </p>
            </div>
            <button
              onClick={() => onNavigateToScreen('due_process')}
              className="px-3 py-1.5 bg-[#13233f] text-white rounded-lg text-xs font-semibold hover:bg-[#1a3d66] transition cursor-pointer flex items-center space-x-1"
            >
              <span>Manage 15-Day Dockets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3" aria-busy={loading}>
            {loading && <p role="status" className="text-xs text-stone-500">Loading the docket…</p>}
            {error && <p role="alert" className="text-xs text-rose-800">{error}</p>}
            {!loading && !error && notices.length === 0 && <p role="status" className="text-xs text-stone-500">No households are under a Notice of Ineligibility in your jurisdiction.</p>}
            {notices.map((notice) => (
              <div 
                key={notice.household_id}
                className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 hover:border-stone-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#13233f]">
                        {notice.household_id}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="font-bold text-xs text-stone-900">
                        {notice.head_of_household.full_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Jurisdiction: {notice.address.barangay}, {notice.address.municipality}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border self-start sm:self-auto ${
                    notice.status === 'UNDER_APPEAL_HEARING'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    {notice.status === 'UNDER_APPEAL_HEARING' ? 'HEARING SCHEDULED (PAUSED)' : '15-DAY NOTICE ACTIVE'}
                  </span>
                </div>

                <div className="text-xs text-stone-700 bg-white p-2.5 rounded-lg border border-stone-200/80 mt-2.5">
                  <span className="font-semibold text-stone-800">Grounds for Ineligibility: </span>
                  <span>{notice.initial_ineligibility_cause}</span>
                </div>

                {notice.appeal_docket_id && (
                  <div className="text-[11px] text-stone-600 mt-2 flex items-center justify-between font-mono bg-blue-50/50 p-2 rounded border border-blue-100">
                    <span>Docket: {notice.appeal_docket_id}</span>
                    <span>Hearing: {notice.hearing_date ? displayDate(notice.hearing_date) : '—'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Statutory Workflow Rules & Schedule */}
        <div className="space-y-4">
          <div className="bg-stone-50 rounded-xl border border-stone-200/90 p-5 space-y-3">
            <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#13233f]" />
              <span>Statutory Due Process Rules (RA 11310)</span>
            </h4>
            <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">1. Mandatory 15-Day Window: </span>
                <span>Beneficiaries have 15 calendar days from notice service to file an evidentiary appeal.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">2. Grant Continuity: </span>
                <span>Cash grant disbursement CANNOT be suspended during an active appeal contestation.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">3. Countdown Freeze: </span>
                <span>Filing an appeal formally pauses the de-listing countdown clock until resolution.</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/90 p-5 space-y-3 shadow-2xs">
            <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Upcoming Hearings Calendar</span>
            </h4>
            <div className="space-y-2 text-xs">
              {hearings.length === 0 && <p className="text-[11px] text-stone-500">No upcoming hearings.</p>}
              {hearings.map(h => (
                <div key={h.household_id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="font-bold text-stone-900">{h.head_of_household.full_name}</div>
                  <div className="text-[11px] text-stone-500">{displayDate(String(h.hearing_date))}</div>
                  <div className="text-[11px] text-[#13233f] font-mono mt-1">Docket: {h.appeal_docket_id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
