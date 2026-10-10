import React, { useRef, useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';
import { AccessibleDialog } from '../common/AccessibleDialog';
import { BeneficiaryTriageItem } from '../../types/contracts';
import { apiErrorMessage } from '../../services/api';
import { dispatchDeadline, dispatchErrorMessage, dispatchTask, DispatchReceipt } from '../../services/taskDispatch';

interface Screen4TaskDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHousehold: BeneficiaryTriageItem | null;
  showSpecAnnotations?: boolean;
  onDispatched?: (receipt: DispatchReceipt) => void;
}

export const Screen4TaskDispatchModal: React.FC<Screen4TaskDispatchModalProps> = ({ isOpen, onClose, targetHousehold, onDispatched }) => {
  const [worker, setWorker] = useState('');
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<DispatchReceipt | null>(null);
  const close = () => { if (!inFlight.current) onClose(); };
  if (!isOpen || !targetHousehold) return null;
  const live = Boolean(onDispatched);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || receipt || !live) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result = await dispatchTask({ household_id: targetHousehold.household_id,
        assigned_worker_id: worker.trim().toLowerCase(), assignment_notes: notes.trim(),
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', due_date: dispatchDeadline(deadline) });
      setReceipt(result);
      onDispatched?.(result);
    } catch (failure) {
      setError(dispatchErrorMessage(failure) || `${apiErrorMessage(failure)} If the request reached the server, check the assignment before retrying.`);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return <AccessibleDialog titleId="dispatch-dialog-title" onClose={close} className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 flex items-center justify-center p-4">
    <div className="dispatch-dialog bg-white rounded-lg shadow-xl border border-stone-200 w-full max-w-xl overflow-hidden">
      <header className="flex items-center justify-between gap-4 p-5 border-b border-stone-200">
        <h3 id="dispatch-dialog-title" className="text-lg font-semibold text-[#132e4f]">{receipt ? 'Task dispatched' : live ? 'Dispatch investigation' : 'Dispatch preview'}</h3>
        <button type="button" onClick={close} disabled={pending} aria-label="Close dispatch dialog" className="p-2 rounded hover:bg-stone-100"><X size={20} /></button>
      </header>
      {receipt ? <div className="p-6 space-y-4">
        <p role="status" className="flex items-center gap-2 text-emerald-800"><CheckCircle2 size={20} />Assignment confirmed by the server.</p>
        <dl className="dispatch-receipt"><dt>Task</dt><dd>{receipt.task_id}</dd><dt>Household</dt><dd>{receipt.household_id}</dd><dt>Audit sequence</dt><dd>{receipt.audit_receipt.sequence_index}</dd></dl>
        <p className="text-sm text-stone-600">The triage queue is refreshing. The assigned caseworker can load the new task from the server.</p>
        <button type="button" onClick={close} className="primary-triage-action">Done</button>
      </div> : <form onSubmit={submit} className="p-6 space-y-4" aria-busy={pending}>
        {!live && <p className="preview-note">Design preview only. No assignments are submitted.</p>}
        <div className="border-b border-stone-200 pb-4">
          <p className="font-semibold text-[#132e4f]">{targetHousehold.head_of_household.full_name}</p>
          <p className="text-sm text-stone-600">{targetHousehold.household_id}</p>
          <p className="text-sm text-stone-600">{targetHousehold.address.barangay}, {targetHousehold.address.municipality}</p>
        </div>
        <fieldset disabled={pending} className="dispatch-fields space-y-4">
          <label htmlFor="dispatch-worker-id">Caseworker account ID<input id="dispatch-worker-id" required value={worker} onChange={event => setWorker(event.target.value)} pattern="[a-fA-F0-9]{24}" maxLength={24} autoComplete="off" spellCheck={false} aria-describedby="dispatch-worker-help" /></label>
          <p id="dispatch-worker-help" className="text-sm text-stone-600">Use the 24-character ID provided by your administrator. A staff directory is not available yet.</p>
          <label htmlFor="dispatch-instructions">Inspection instructions<textarea id="dispatch-instructions" required rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label htmlFor="dispatch-deadline">Deadline (Philippine time)<input id="dispatch-deadline" type="date" required value={deadline} onChange={event => setDeadline(event.target.value)} /></label>
            <label htmlFor="dispatch-priority">Priority<select id="dispatch-priority" value={priority} onChange={event => setPriority(event.target.value)}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-4">
          <button type="button" onClick={close} disabled={pending} className="px-4 py-2 rounded hover:bg-stone-100">Cancel</button>
          <button id="confirm-dispatch-submit-btn" type="submit" disabled={pending || !live} className="primary-triage-action disabled:opacity-50"><Send size={16} />{pending ? 'Dispatching...' : 'Confirm dispatch'}</button>
        </footer>
      </form>}
    </div>
  </AccessibleDialog>;
};
