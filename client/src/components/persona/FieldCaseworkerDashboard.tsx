import React from 'react';
import { displayDate } from '../../utils/displayDate';
import { FieldTaskItem, UserSession } from '../../types/contracts';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  ArrowRight, 
  Calendar, 
  Building, 
  ShieldCheck,
  Phone,
  FileCheck
} from 'lucide-react';

interface FieldCaseworkerDashboardProps {
  user: UserSession['user'];
  tasks: FieldTaskItem[];
  onStartVerification: (task: FieldTaskItem) => void;
  onNavigateToTasks: () => void;
  onOpenSyncDrawer: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingDrafts?: number;
  showSpecAnnotations?: boolean;
}

export const FieldCaseworkerDashboard: React.FC<FieldCaseworkerDashboardProps> = ({
  user,
  tasks,
  onStartVerification,
  onNavigateToTasks,
  onOpenSyncDrawer,
  isOffline,
  onToggleOffline,
  pendingDrafts = 0,
  showSpecAnnotations = false,
}) => {
  const nextPriorityTask = tasks[0];
  // All figures below are computed from the tasks the server assigned (GET /tasks/assigned).
  const manilaDay = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';
  const today = manilaDay(new Date().toISOString());
  const dueTimes = tasks.map(t => Date.parse(t.due_date)).filter(Number.isFinite);
  const overdue = dueTimes.filter(time => time < Date.now()).length;
  const dueToday = tasks.filter(t => manilaDay(t.due_date) === today).length;
  const nextDue = dueTimes.filter(time => time >= Date.now()).sort((a, b) => a - b)[0];
  const daysToNext = nextDue ? Math.ceil((nextDue - Date.now()) / 86400000) : null;
  const barangayCaseload = user.jurisdiction.assigned_barangays.map(name => {
    const mine = tasks.filter(t => t.address.barangay === name);
    return { name, total: mine.length, critical: mine.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length };
  });
  const maxCaseload = Math.max(1, ...barangayCaseload.map(b => b.total));

  return (
    <div className="module-page field-dashboard">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">PERSONA 2: Municipal Link Caseworker Operational Hub</span>
            <span className="ml-2">Local Jurisdictional Caseload & Ground Verification (Calamba City)</span>
          </div>
          <div>ml-caseworker-hub.json</div>
        </div>
      )}

      {/* Caseworker Profile & Header */}
      <div className="module-heading">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#132e4f] text-amber-300 font-bold text-base flex items-center justify-center shadow-2xs">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight font-display">
                Field Overview
              </h2>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                Municipal Link
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Caseworker: <span className="font-semibold text-stone-800">{user.full_name}</span> · Jurisdiction: {user.jurisdiction.municipality} ({user.jurisdiction.assigned_barangays.join(', ')})
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center space-x-3 self-start md:self-auto shrink-0">
          <button
            onClick={onToggleOffline}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 cursor-pointer ${
              isOffline
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-700" /> : <Wifi className="w-3.5 h-3.5 text-emerald-700" />}
            <span>{isOffline ? 'Offline Mode Active' : 'Network Available'}</span>
          </button>

          <button
            onClick={onOpenSyncDrawer}
            className="px-3 py-1.5 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Sync Queue</span>
          </button>
        </div>
      </div>

      {/* Primary Field Caseworker KPIs */}
      <div className="data-section-label">Operational snapshot</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Assigned Field Dockets */}
        <button type="button"
          onClick={onNavigateToTasks}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Assigned Caseload</span>
            <ClipboardList className="w-4 h-4 text-[#132e4f]" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{tasks.length}</span>
            <span className="text-[11px] font-medium text-stone-500">Households</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{tasks.length} pending in-person visit{tasks.length === 1 ? '' : 's'}</span>
          </div>
        </button>

        {/* KPI 2: Today's Scheduled Itinerary */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Due Today</span>
            <Calendar className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{dueToday}</span>
            <span className="text-[11px] font-medium text-amber-700">Philippine date</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {barangayCaseload.filter(b => b.total).length} barangay{barangayCaseload.filter(b => b.total).length === 1 ? '' : 's'} with open visits
          </div>
        </div>

        {/* KPI 3: Statutory Deadline Compliance */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Statutory Clock (+14d)</span>
            <Clock className="w-4 h-4 text-[#132e4f]" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{tasks.length ? `${Math.round((100 * (tasks.length - overdue)) / tasks.length)}%` : '—'}</span>
            <span className={`text-[11px] font-medium ${overdue ? 'text-rose-700' : 'text-emerald-800'}`}>{overdue ? `${overdue} overdue` : 'On Schedule'}</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {daysToNext === null ? 'No upcoming deadline' : `Next deadline in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* KPI 4: Offline Field Cache Health */}
        <button type="button"
          onClick={onOpenSyncDrawer}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">IndexedDB Cache</span>
            <FileCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-2xl font-bold font-mono text-stone-900">{pendingDrafts} Pending</span>
            <span className="text-[11px] font-medium text-stone-500">{isOffline ? 'Waiting for signal' : 'Syncs automatically'}</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            Reports saved on this device
          </div>
        </button>

      </div>

      {/* Main Grid: Priority Visit Action + Barangay Caseload Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Next Immediate Priority Verification Visit */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <h3 className="text-sm font-bold text-stone-900 font-display">
                  Immediate Priority In-Person Inspection
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                Statutory Notice Pending
              </span>
            </div>

            {!nextPriorityTask && <p className="pt-4 text-xs text-stone-500">No assigned visits. New tasks appear here after a director dispatches them.</p>}
            {nextPriorityTask && (
              <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="font-mono font-bold text-sm text-[#132e4f]">
                        {nextPriorityTask.household_id}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-base font-bold text-stone-900 font-display">
                        {nextPriorityTask.head_of_household.first_name} {nextPriorityTask.head_of_household.last_name}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>
                        {nextPriorityTask.address.sitio ? `${nextPriorityTask.address.sitio}, ` : ''}
                        {nextPriorityTask.address.barangay}, {nextPriorityTask.address.municipality}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200">
                      {nextPriorityTask.priority} PRIORITY
                    </span>
                  </div>
                </div>

                {/* Dispatch Investigation Instructions Callout */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-stone-700 flex items-center justify-between">
                    <span>Field Evidentiary Mandate</span>
                    <span className="font-mono text-stone-500 text-[10px]" title={nextPriorityTask.due_date}>Due: {displayDate(nextPriorityTask.due_date)}</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed italic">
                    &quot;{nextPriorityTask.dispatch_instructions}&quot;
                  </p>
                </div>

                {/* Direct Action Button */}
                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    id="caseworker-start-priority-visit-btn"
                    onClick={() => onStartVerification(nextPriorityTask)}
                    className="w-full sm:w-auto flex-1 min-h-[44px] py-2.5 px-5 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold text-xs rounded-lg shadow-2xs transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Launch 5-Step Field Assessment Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onNavigateToTasks}
                    className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-lg transition cursor-pointer"
                  >
                    View All Assigned Tasks ({tasks.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Task List Queue */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 font-display">
              Assigned Queue Overview
            </h3>
            <div className="divide-y divide-stone-100">
              {tasks.map((task) => (
                <div key={task.task_id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#132e4f]">{task.household_id}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs font-semibold text-stone-900">
                        {task.head_of_household.first_name} {task.head_of_household.last_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {task.address.barangay} · Due: {displayDate(task.due_date)}
                    </div>
                  </div>

                  <button
                    onClick={() => onStartVerification(task)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-[#132e4f] hover:text-white text-stone-700 font-semibold text-xs rounded-md transition cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Barangay Jurisdiction Caseload & Offline Tooling */}
        <div className="space-y-4">
          
          {/* Barangay Caseload Distribution */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 font-display">
              Barangay Distribution
            </h3>
            <p className="text-xs text-stone-500">
              Open visits in your assigned barangays.
            </p>

            <div className="space-y-2.5 pt-2">
              {barangayCaseload.map((brgy) => (
                <div key={brgy.name} className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                    <span>{brgy.name}</span>
                    <span className="font-mono">{brgy.total} Open</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                    <span>{brgy.critical} high or critical priority</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-stone-200 rounded-full h-1 mt-2 overflow-hidden">
                    <div 
                      className="bg-[#132e4f] h-full"
                      style={{ width: `${(brgy.total / maxCaseload) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Toolkit Card */}
          <div className="bg-stone-50 p-5 rounded-xl border border-stone-200/90 space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-stone-900 font-display">
                Field Protocols & Standards
              </h4>
            </div>
            <ul className="text-[11px] text-stone-600 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>LandBank cash cards must be physically held in beneficiary's hand.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Registered vehicles require productive delivery franchise proof (Angkas/MoveIt).</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>GPS coordinates are cryptographically hashed upon photo capture.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
