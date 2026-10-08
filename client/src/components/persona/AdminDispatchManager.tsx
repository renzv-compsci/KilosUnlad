import React, { useState } from 'react';
import { MOCK_FIELD_TASKS } from '../../data/mockContracts';
import { MapPin, Plus, Users } from 'lucide-react';
import { SampleDataLabel } from '../common/SampleDataLabel';
import { displayDate } from '../../utils/displayDate';

interface AdminDispatchManagerProps {
  onSelectHousehold: () => void;
  showSpecAnnotations?: boolean;
}

export const AdminDispatchManager: React.FC<AdminDispatchManagerProps> = ({
  onSelectHousehold, showSpecAnnotations = false,
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('ALL');
  const tasks = MOCK_FIELD_TASKS;
  const municipalities = [...new Set(tasks.map((task) => task.address.municipality))];
  const visibleTasks = tasks.filter((task) => selectedMunicipality === 'ALL' || task.address.municipality === selectedMunicipality);
  const caseworkers = [
    { name: 'Marvin Bautista, RSW', lgu: 'Calamba City', activeTasks: 3, completedMonth: 14, status: 'Active In Field' },
    { name: 'Elena Rosales, RSW', lgu: 'Santa Rosa City', activeTasks: 2, completedMonth: 18, status: 'Office / Report Filing' },
    { name: 'Danilo Cruz, RSW', lgu: 'Biñan City', activeTasks: 4, completedMonth: 12, status: 'Active In Field' },
    { name: 'Maria Santos, RSW', lgu: 'San Pedro City', activeTasks: 3, completedMonth: 11, status: 'Active In Field' },
  ];

  return (
    <div className="module-page dispatch-page operations-page">
      {showSpecAnnotations && <p>Administrator Caseload &amp; Task Dispatch Manager</p>}
      <header className="module-heading">
        <div>
          <SampleDataLabel />
          <h2>Caseworker Dispatch</h2>
          <p>Field assignments across the Laguna pilot municipalities.</p>
        </div>
        <button id="admin-new-dispatch-btn" onClick={onSelectHousehold} className="primary-triage-action">
          <Plus size={18} aria-hidden="true" /> Select Household
        </button>
      </header>

      <section aria-labelledby="dispatch-list-heading">
        <div className="operations-toolbar">
          <h3 id="dispatch-list-heading">Assignments <span className="quiet-count">{visibleTasks.length}</span></h3>
          <label className="operations-filter">
            <span>Municipality</span>
            <select value={selectedMunicipality} onChange={(event) => setSelectedMunicipality(event.target.value)}>
              <option value="ALL">All municipalities</option>
              {municipalities.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
            </select>
          </label>
        </div>
        <div className="operations-records">
          {visibleTasks.map((task) => (
            <article key={task.task_id} className="operations-record" aria-label={`Assignment for ${task.head_of_household.first_name} ${task.head_of_household.last_name}`}>
              <div className="record-main">
                <h4>{task.head_of_household.first_name} {task.head_of_household.last_name}</h4>
                <p className="record-location"><MapPin size={15} aria-hidden="true" />{task.address.barangay}, {task.address.municipality}</p>
                <details className="record-details">
                  <summary>Assignment details</summary>
                  <dl><div><dt>Household</dt><dd>{task.household_id}</dd></div><div><dt>Task</dt><dd>{task.task_id}</dd></div></dl>
                  <p>{task.dispatch_instructions}</p>
                </details>
              </div>
              <div className="record-status">
                <span className="quiet-status">{task.priority} priority</span>
                <span className="record-date-label">Due <time dateTime={task.due_date} title={task.due_date}>{displayDate(task.due_date)}</time></span>
              </div>
              <div className="record-action-area">
                <button disabled aria-describedby={`reassign-status-${task.task_id}`} className="record-action">Reassign</button>
                <p id={`reassign-status-${task.task_id}`} className="action-availability">Not connected</p>
              </div>
            </article>
          ))}
          {visibleTasks.length === 0 && <p className="operations-empty" role="status">No assignments in this municipality.</p>}
        </div>
      </section>

      <details className="staff-disclosure">
        <summary><Users size={18} aria-hidden="true" /><span>Field staff</span><span className="quiet-count">{caseworkers.length} caseworkers</span></summary>
        <div className="staff-list">
          {caseworkers.map((worker) => (
            <article key={worker.name}>
              <div><h4>{worker.name}</h4><p>{worker.lgu}</p></div>
              <p><strong>{worker.activeTasks}</strong> active <span aria-hidden="true"> / </span><strong>{worker.completedMonth}</strong> completed</p>
              <span className="quiet-status">{worker.status}</span>
            </article>
          ))}
        </div>
      </details>
      <details className="context-details">
        <summary>Dispatch policy</summary>
        <p>Assigned verification tasks have statutory 14-day completion clocks under RA 11310.</p>
      </details>
    </div>
  );
};
