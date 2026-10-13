import React, { useEffect, useState } from 'react';
import { MapPin, Plus, RefreshCw, Users } from 'lucide-react';
import { displayDate } from '../../utils/displayDate';
import { AdminTaskItem, apiErrorMessage, CaseworkerItem, fetchAdminTasks, fetchCaseworkers } from '../../services/api';

interface AdminDispatchManagerProps {
  onSelectHousehold: () => void;
  showSpecAnnotations?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_DISPATCH: 'Awaiting visit', CACHED_OFFLINE: 'Downloaded by worker', SUBMITTED: 'Report submitted',
  VERIFIED_GRADUATE: 'Verified: graduate', VERIFIED_RETAIN: 'Verified: retain',
};

// Live task list (GET /tasks) and case worker directory (GET /users/caseworkers).
export const AdminDispatchManager: React.FC<AdminDispatchManagerProps> = ({
  onSelectHousehold, showSpecAnnotations = false,
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('ALL');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [caseworkers, setCaseworkers] = useState<CaseworkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([fetchAdminTasks({ page, limit: 20, ...(status ? { status } : {}) }, controller.signal), fetchCaseworkers(controller.signal)])
      .then(([list, workers]) => { setTasks(list.items); setTotal(list.pagination.total_records); setTotalPages(list.pagination.total_pages); setCaseworkers(workers); })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status, reload]);

  const municipalities = [...new Set(tasks.map((task) => task.address.municipality))];
  const visibleTasks = tasks.filter((task) => selectedMunicipality === 'ALL' || task.address.municipality === selectedMunicipality);

  return (
    <div className="module-page dispatch-page operations-page">
      {showSpecAnnotations && <p>Administrator Caseload &amp; Task Dispatch Manager</p>}
      <header className="module-heading">
        <div>
          <h2>Caseworker Dispatch</h2>
          <p>Field verification tasks for households in your jurisdiction.</p>
        </div>
        <button id="admin-new-dispatch-btn" onClick={onSelectHousehold} className="primary-triage-action">
          <Plus size={18} aria-hidden="true" /> Select Household
        </button>
      </header>
      <p id="dispatch-preview-note" className="preview-note">New dispatches are created from the triage queue. Reassignment is not supported by the server.</p>

      <section aria-labelledby="dispatch-list-heading" aria-busy={loading}>
        <div className="operations-toolbar">
          <h3 id="dispatch-list-heading">Assignments <span className="quiet-count">{total}</span></h3>
          <label className="operations-filter">
            <span>Status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="operations-filter">
            <span>Municipality</span>
            <select value={selectedMunicipality} onChange={(event) => setSelectedMunicipality(event.target.value)}>
              <option value="ALL">All municipalities</option>
              {municipalities.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
            </select>
          </label>
          <button type="button" className="record-action" onClick={() => setReload(n => n + 1)} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
        </div>
        {error && <p role="alert" className="operations-empty">{error}</p>}
        <div className="operations-records">
          {visibleTasks.map((task) => (
            <article key={task.task_id} className="operations-record" aria-label={`Assignment for ${task.head_of_household.full_name}`}>
              <div className="record-main">
                <h4>{task.head_of_household.full_name}</h4>
                <p className="record-location"><MapPin size={15} aria-hidden="true" />{task.address.barangay}, {task.address.municipality}</p>
                <details className="record-details">
                  <summary>Assignment details</summary>
                  <dl>
                    <div><dt>Household</dt><dd>{task.household_id}</dd></div>
                    <div><dt>Task</dt><dd>{task.task_id}</dd></div>
                    <div><dt>Caseworker</dt><dd>{task.assigned_worker?.full_name ?? 'Unassigned'}</dd></div>
                    <div><dt>Risk score</dt><dd>{task.composite_risk_score}</dd></div>
                    <div><dt>Dispatched</dt><dd>{task.dispatched_at ? displayDate(task.dispatched_at) : '—'}</dd></div>
                  </dl>
                </details>
              </div>
              <div className="record-status">
                <span className="quiet-status">{STATUS_LABELS[task.task_status] ?? task.task_status}</span>
                <span className="quiet-status">{task.priority} priority</span>
                {task.due_date && <span className="record-date-label">Due <time dateTime={task.due_date} title={task.due_date}>{displayDate(task.due_date)}</time></span>}
              </div>
              <div className="record-action-area">
                <span className="record-date-label">{task.assigned_worker?.full_name ?? 'Unassigned'}</span>
              </div>
            </article>
          ))}
          {!loading && !error && visibleTasks.length === 0 && <p className="operations-empty" role="status">No assignments yet. Dispatch a flagged household from the triage queue.</p>}
          {loading && <p className="operations-empty" role="status">Loading assignments…</p>}
        </div>
        {totalPages > 1 && <nav className="operations-toolbar" aria-label="Assignment pages">
          <button type="button" className="record-action" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="quiet-count">Page {page} of {totalPages}</span>
          <button type="button" className="record-action" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>}
      </section>

      <details className="staff-disclosure" open={caseworkers.length > 0 && caseworkers.length <= 6}>
        <summary><Users size={18} aria-hidden="true" /><span>Field staff</span><span className="quiet-count">{caseworkers.length} caseworkers</span></summary>
        <div className="staff-list">
          {caseworkers.map((worker) => (
            <article key={worker.user_id}>
              <div><h4>{worker.full_name}</h4><p>{worker.jurisdiction.municipality ?? '—'}: {worker.jurisdiction.assigned_barangays.join(', ') || 'no barangays'}</p></div>
              <p><strong>{worker.open_tasks}</strong> open task{worker.open_tasks === 1 ? '' : 's'}</p>
              <span className="quiet-status">@{worker.username}</span>
            </article>
          ))}
          {!loading && caseworkers.length === 0 && <p className="operations-empty">No active caseworkers cover your barangays.</p>}
        </div>
      </details>
      <details className="context-details">
        <summary>Dispatch policy</summary>
        <p>Assigned verification tasks have statutory 14-day completion clocks under RA 11310. The caseworker must cover the household's barangay.</p>
      </details>
    </div>
  );
};
