import { AccessibleDialog } from '../common/AccessibleDialog';
import React from 'react';
import { FieldTaskSubmission } from '../../types/contracts';
import { 
  X, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Database, 
  ArrowUpRight, 
  FileText,
  AlertCircle,
  HardDrive
} from 'lucide-react';

interface Screen9OfflineSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  submissions: FieldTaskSubmission[];
  onSyncAll: () => void;
  isSyncing: boolean;
  submissionAvailable?: boolean;
  showSpecAnnotations?: boolean;
}

export const Screen9OfflineSyncDrawer: React.FC<Screen9OfflineSyncDrawerProps> = ({
  isOpen,
  onClose,
  isOffline,
  onToggleOffline,
  submissions,
  onSyncAll,
  isSyncing,
  submissionAvailable = false,
  showSpecAnnotations = false,
}) => {
  if (!isOpen) return null;

  const handleForceSync = () => {
    if (!submissionAvailable) return;
    if (isOffline) {
      alert('Wi-Fi or cellular connection required to sync with central DSWD GovCloud. Please connect to a network.');
      return;
    }

    onSyncAll();
  };

  const pendingCount = submissions.filter((s) => s.sync_status === 'PENDING_SYNC').length;
  const syncedCount = submissions.filter((s) => s.sync_status === 'SYNCED').length;

  return (
    <AccessibleDialog titleId="sync-dialog-title" onClose={onClose} busy={isSyncing} className="workspace-dialog sync-dialog fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Drawer Header */}
        <div className="bg-white border-b border-slate-200/80 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="sync-dialog-title" className="text-sm font-bold text-slate-900">
                  Saved Drafts
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assessments saved on this device; submitted when online
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close saved drafts"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spec Annotation */}
        {showSpecAnnotations && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-[10px] font-mono text-slate-600 flex justify-between">
            <span>POST /api/v1/tasks/:id/submit</span>
            <span>Contract: field-task-submission.json</span>
          </div>
        )}

        {/* Connectivity Status Banner */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs ${
          isOffline
            ? 'bg-amber-50/60 border-amber-200/80 text-amber-900'
            : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
        }`}>
          <div className="flex items-center space-x-2">
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="font-medium">
              {isOffline ? 'Offline' : 'Online'}
            </span>
          </div>

          <button
            onClick={onToggleOffline}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
          >
            {isOffline ? 'Use online mode' : 'Use offline mode'}
          </button>
        </div>

        {/* List of Pending Reports Stored in IndexedDB */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Saved on this device</span>
            <span className="tabular-nums">{submissions.length} {submissions.length === 1 ? 'report' : 'reports'}</span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              <HardDrive className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs">No assessment drafts saved on this device.</p>
            </div>
          ) : (
            submissions.map((sub, idx) => {
              const isPending = sub.sync_status === 'PENDING_SYNC';
              const isRejected = sub.sync_status === 'ERROR';

              return (
                <div
                  key={sub.task_id || idx}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-1.5 rounded-md mt-0.5 ${
                      isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isPending ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 tabular-nums" title={`Task ${sub.task_id}`}>
                          {sub.household_id}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        Recommendation: <span className="font-semibold text-blue-900">{sub.worker_recommendation === 'RECOMMEND_GRADUATION' ? 'Graduate' : sub.worker_recommendation === 'RETAIN' ? 'Keep on program' : 'Investigate'}</span> — {sub.narrative_report}
                      </p>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1 tabular-nums">
                        <span>Saved {sub.timestamp ? new Date(sub.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'recently'}</span>
                        <span>·</span>
                        <span>{sub.evidence_attachments?.length || 0} {(sub.evidence_attachments?.length || 0) === 1 ? 'photo' : 'photos'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isPending ? 'bg-amber-100 text-amber-900 border border-amber-200' : isRejected ? 'bg-rose-100 text-rose-900 border border-rose-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {isPending ? 'Not sent yet' : isRejected ? 'Rejected by server' : 'Sent'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Manual Override: Force Sync Now */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 space-y-2.5">
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Waiting: <strong className="text-slate-800 tabular-nums">{pendingCount}</strong></span>
            <span>Sent: <strong className="text-slate-800 tabular-nums">{syncedCount}</strong></span>
          </div>

          <button
            id="force-sync-now-btn"
            type="button"
            disabled={!submissionAvailable || isOffline || isSyncing || pendingCount === 0}
            aria-describedby="sync-action-status"
            onClick={handleForceSync}
            className={`w-full min-h-[42px] py-2 px-4 rounded-lg font-semibold text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer ${
              isOffline
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-blue-700 hover:bg-blue-800 text-white'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending reports…</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {!submissionAvailable ? 'Submission unavailable' : isOffline
                    ? 'Connect to the internet to send'
                    : `Send now (${pendingCount} waiting)`}
                </span>
              </>
            )}
          </button>

        </div>

      </div>
      <span id="sync-action-status" className="sr-only" role="status">{!submissionAvailable ? 'Server submission is not available. Drafts remain on this device.' : isSyncing ? 'Sync in progress.' : pendingCount === 0 ? 'No pending reports to sync.' : isOffline ? 'Network connection required.' : `${pendingCount} reports ready to sync.`}</span>
    </AccessibleDialog>
  );
};
