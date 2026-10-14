import React from 'react';
import { displayDate } from '../../utils/displayDate';
import { FieldTaskItem, UserSession } from '../../types/contracts';
import { 
  Wifi, 
  WifiOff, 
  ClipboardList, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Database,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface Screen7FieldTasksListProps {
  user: UserSession['user'];
  isOffline: boolean;
  onToggleOffline: () => void;
  onStartVerification: (task: FieldTaskItem) => void;
  onOpenSyncDrawer: () => void;
  showSpecAnnotations?: boolean;
  tasks?: FieldTaskItem[];
}

export const Screen7FieldTasksList: React.FC<Screen7FieldTasksListProps> = ({
  user,
  isOffline,
  onToggleOffline,
  onStartVerification,
  onOpenSyncDrawer,
  showSpecAnnotations = false,
  tasks = [],
}) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="module-page field-tasks-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[10px] font-mono text-slate-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">SCREEN 7: Assigned Field Tasks List</span>
            <span className="ml-2">Tablet PWA Mode (Touch Target ≥ 44px)</span>
          </div>
          <div>field-task-download.json</div>
        </div>
      )}

      <header className="module-heading">
        <div><h2>Assigned Tasks</h2><p>{user.full_name} · {user.jurisdiction.municipality}</p></div>
        <span className="quiet-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
      </header>

      {/* Connectivity is separate from whether individual tasks have a local copy. */}
      <div 
        id="field-network-connectivity-banner"
        className={`field-connectivity p-3 border flex items-center justify-between transition-colors ${
          isOffline
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg ${isOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          </div>
          <div className="text-xs sm:text-sm leading-tight">
            <span className="font-semibold">
              {isOffline ? 'Offline' : 'Online'}
            </span>
            <div className="text-[11px] font-normal text-slate-500 mt-0.5">
              {`${tasks.filter(task => task.cached_offline).length} of ${tasks.length} visits saved on this phone`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleOffline}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer shadow-xs"
          >
            {isOffline ? 'Go Online' : 'Work Offline'}
          </button>
          
          <button
            onClick={onOpenSyncDrawer}
            className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-[11px] font-medium shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Saved Drafts
          </button>
        </div>
      </div>

      {/* 2. Task Card Feed */}
      <div className="space-y-4">
        {tasks.length === 0 && <div role="status" className="workspace-state"><ClipboardList aria-hidden="true" /><p>No tasks are assigned to this account.</p></div>}
        {tasks.map((task) => (
          <div
            key={task.task_id}
            id={`task-card-${task.task_id}`}
            className="field-task-card bg-white border border-slate-200/80 overflow-hidden hover:border-slate-300 transition"
          >
            
            {/* Card Header: household_id + Priority pill */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-700 tabular-nums" title={`Task ${task.task_id}`}>
                  {task.household_id}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getPriorityStyle(task.priority)}`}>
                  {task.priority.charAt(0)}{task.priority.slice(1).toLowerCase()} priority
                </span>
                {task.cached_offline && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60">
                    Saved offline
                  </span>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-3.5">
              
              {/* Family Details: head_of_household.first_name + last_name, address */}
              <div>
                <div className="text-xs text-slate-500">
                  Head of household
                </div>
                <div className="text-base font-semibold text-slate-900 mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    {task.head_of_household.first_name} {task.head_of_household.last_name}
                  </span>
                  <span className="text-xs font-normal text-slate-500 tabular-nums">
                    {task.head_of_household.national_id}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {task.address.sitio ? `${task.address.sitio}, ` : ''}{task.address.barangay}, {task.address.municipality}
                  </span>
                </div>
              </div>

              {/* Audit Focus Box: Box displaying dispatch_instructions */}
              <div 
                id={`audit-focus-box-${task.task_id}`}
                className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-lg"
              >
                <div className="flex items-center space-x-1.5 text-amber-900 font-semibold text-xs mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>What to check</span>
                </div>
                <p className="text-xs text-amber-950 font-normal leading-relaxed">
                  {task.dispatch_instructions || 'No extra instructions. Complete the standard household check.'}
                </p>
                {showSpecAnnotations && (
                  <span className="text-[9px] font-mono text-amber-800 block mt-1">
                    [Binding: task.dispatch_instructions]
                  </span>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500 pt-1 tabular-nums">
                {task.dispatched_at ? <span>Assigned <time dateTime={task.dispatched_at} title={task.dispatched_at}>{displayDate(task.dispatched_at)}</time></span> : <span />}
                <span className="text-slate-700 font-medium">Due <time dateTime={task.due_date} title={task.due_date}>{displayDate(task.due_date)}</time></span>
              </div>

              {/* Action: Large Touch-Friendly Button Start In-Person Verification (>= 44px) */}
              <div className="pt-2">
                <button
                  id={`start-verification-btn-${task.task_id}`}
                  onClick={() => onStartVerification(task)}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Start in-person visit</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
