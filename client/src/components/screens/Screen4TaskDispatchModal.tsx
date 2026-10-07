import { AccessibleDialog } from '../common/AccessibleDialog';
import React, { useState } from 'react';
import { BeneficiaryTriageItem } from '../../types/contracts';
import { MOCK_MUNICIPAL_LINKS } from '../../data/mockContracts';
import { X, Send, Calendar, User, ShieldCheck } from 'lucide-react';

interface Screen4TaskDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHousehold: BeneficiaryTriageItem | null;
  showSpecAnnotations?: boolean;
}

export const Screen4TaskDispatchModal: React.FC<Screen4TaskDispatchModalProps> = ({
  isOpen,
  onClose,
  targetHousehold,
  showSpecAnnotations = false,
}) => {
  // Default due date: +14 days
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | ''>('');

  if (!isOpen || !targetHousehold) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Preview only: no dispatch integration is connected in this frontend.
  };

  return (
    <AccessibleDialog titleId="dispatch-dialog-title" onClose={onClose} className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-stone-200/90 w-full max-w-xl overflow-hidden transition-all">
        
        {/* Modal Header */}
        <div className="bg-stone-50/70 border-b border-stone-200/90 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#132e4f] text-white rounded-lg shadow-2xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 id="dispatch-dialog-title" className="text-base font-bold text-stone-900 font-display">
                Dispatch Preview
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Statutory On-Site SWDI Verification (DSWD Field Operations)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dispatch dialog"
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spec Annotation Banner */}
        {showSpecAnnotations && (
          <div className="bg-stone-100/80 border-b border-stone-200 px-4 py-1 text-[10px] font-mono text-stone-600 flex justify-between">
            <span>POST /api/v1/tasks/dispatch</span>
            <span>Contract: admin-task-dispatch.json</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-stone-800">
          <p id="dispatch-preview-status" className="preview-note">Preview only. Staff choices are sample data. Dispatch is not connected; no task will be created.</p>
          
          {/* Target Display: Shows household_id and family name */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
              Target Beneficiary Household
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-[#132e4f] text-sm">
                  {targetHousehold.household_id}
                </span>
                <span className="text-stone-300 mx-2">·</span>
                <span className="font-bold text-stone-900 text-sm font-display">
                  {targetHousehold.head_of_household.full_name}
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-500">
                PhilSys: {targetHousehold.head_of_household.national_id}
              </span>
            </div>
            <div className="text-xs text-stone-600">
              Jurisdiction: {targetHousehold.address.barangay}, {targetHousehold.address.municipality} ({targetHousehold.address.province})
            </div>
          </div>

          {/* Worker Selector: Municipal Links assigned to that barangay */}
          <div>
            <label htmlFor="dispatch-worker-select" className="block font-semibold text-stone-700 mb-1.5 text-xs flex items-center justify-between">
              <span>Assigned Municipal Link Caseworker</span>
              {showSpecAnnotations && <span className="text-[9px] font-mono text-stone-400">assigned_worker_id</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-stone-400" />
              </div>
              <select
                id="dispatch-worker-select"
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#132e4f] outline-none bg-white cursor-pointer"
              >
                <option value="" disabled>Select a sample caseworker</option>
                {MOCK_MUNICIPAL_LINKS.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} — Area: {worker.area} ({worker.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input: assignment_notes (Textarea) */}
          <div>
            <label htmlFor="dispatch-notes-input" className="block font-semibold text-stone-700 mb-1.5 text-xs flex items-center justify-between">
              <span>Inspection Instructions <span className="required-label">(required)</span></span>
              {showSpecAnnotations && <span className="text-[9px] font-mono text-stone-400">assignment_notes</span>}
            </label>
            <textarea
              id="dispatch-notes-input"
              rows={3}
              required
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="Verify whether registered vehicle is a productive livelihood asset or personal property..."
              className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#132e4f] outline-none leading-relaxed"
            />
          </div>

          {/* Grid: due_date and priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Input: due_date */}
            <div>
              <label htmlFor="dispatch-due-date-input" className="block font-semibold text-stone-700 mb-1.5 text-xs flex items-center justify-between">
                <span>Deadline <span className="required-label">(required)</span></span>
                {showSpecAnnotations && <span className="text-[9px] font-mono text-stone-400">due_date (+14d)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  id="dispatch-due-date-input"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#132e4f] outline-none bg-white"
                />
              </div>
            </div>

            {/* Radio selector: priority */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5 text-xs flex items-center justify-between">
                <span>Priority Level</span>
                {showSpecAnnotations && <span className="text-[9px] font-mono text-stone-400">priority</span>}
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200 text-center font-medium text-[11px]">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((lvl) => (
                  <label
                    key={lvl}
                    className={`py-1.5 rounded cursor-pointer transition ${
                      priority === lvl
                        ? lvl === 'CRITICAL' ? 'bg-rose-700 text-white shadow-2xs font-semibold'
                        : lvl === 'HIGH' ? 'bg-amber-700 text-white shadow-2xs font-semibold'
                        : 'bg-[#132e4f] text-white shadow-2xs font-semibold'
                        : 'text-stone-600 hover:bg-stone-200/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={lvl}
                      checked={priority === lvl}
                      onChange={() => setPriority(lvl)}
                      className="sr-only"
                    />
                    {lvl}
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Action: Button Confirm Dispatch */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium rounded-lg text-xs hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-dispatch-submit-btn"
              type="submit"
              disabled
              aria-describedby="dispatch-preview-status"
              className="px-4 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch unavailable</span>
            </button>
          </div>

        </form>

      </div>
    </AccessibleDialog>
  );
};
