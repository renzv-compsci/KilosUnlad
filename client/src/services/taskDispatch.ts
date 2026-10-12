import { api } from './api';
import { readStoredSession } from './authSession';
import { canDispatch } from '../types/permissions';

export interface DispatchInput {
  household_id: string;
  assigned_worker_id: string;
  assignment_notes: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  due_date: string;
}
export interface DispatchReceipt {
  task_id: string;
  household_id: string;
  assigned_worker_id: string;
  task_status: 'PENDING_DISPATCH';
  household_status: 'UNDER_INVESTIGATION';
  dispatched_at: string;
  audit_receipt: { sequence_index: number; entry_hash: string };
}

export function dispatchDeadline(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error('Choose a valid deadline.');
  }
  // Calendar deadlines are end-of-day Philippine time, independent of device timezone.
  return `${day}T23:59:59+08:00`;
}

export function validateDispatch(input: DispatchInput): void {
  if (!input.household_id.trim() || input.household_id.length > 128) throw new Error('Select a valid household.');
  if (!/^[a-f0-9]{24}$/i.test(input.assigned_worker_id)) throw new Error('Enter the caseworker\'s 24-character account ID.');
  if (!input.assignment_notes.trim()) throw new Error('Enter inspection instructions.');
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(input.priority)) throw new Error('Choose a priority.');
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(input.due_date) || !Number.isFinite(Date.parse(input.due_date)) || Date.parse(input.due_date) <= Date.now()) throw new Error('Choose a future deadline.');
}

export async function dispatchTask(input: DispatchInput): Promise<DispatchReceipt> {
  const session = readStoredSession();
  if (!session || !canDispatch(session.user.role)) throw new Error('Only administrators and regional directors can dispatch tasks.');
  validateDispatch(input);
  const response = await api.post('/tasks/dispatch', input);
  const result = response.data?.data ?? response.data;
  if (response.status !== 201 || response.headers['x-kilosunlad-mock'] === 'true' ||
      !result || typeof result.task_id !== 'string' || !result.task_id.trim() ||
      result.household_id !== input.household_id || result.assigned_worker_id !== input.assigned_worker_id ||
      result.task_status !== 'PENDING_DISPATCH' || result.household_status !== 'UNDER_INVESTIGATION' ||
      !Number.isFinite(Date.parse(result.dispatched_at)) ||
      !Number.isSafeInteger(result.audit_receipt?.sequence_index) || result.audit_receipt.sequence_index < 1 ||
      !/^[a-f0-9]{64}$/i.test(result.audit_receipt?.entry_hash ?? '')) {
    throw new Error('The server did not return a valid dispatch receipt. Check the assignment before retrying.');
  }
  return result;
}

export function dispatchErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { error?: { code?: string } } } })?.response;
  const code = response?.data?.error?.code;
  const messages: Record<string, string> = {
    ACTIVE_TASK_EXISTS: 'This household already has an active task. Refresh the queue before dispatching again.',
    INVALID_ASSIGNED_WORKER: 'The worker ID must belong to an active caseworker.',
    INVALID_DISPATCH_REQUEST: 'The dispatch details were rejected. Check the worker ID, priority and deadline.',
    HOUSEHOLD_NOT_FOUND: 'This household no longer exists. Refresh the queue.',
    WORKFLOW_CONFLICT: 'This household is no longer eligible for dispatch. Refresh the queue.',
    WORKFLOW_PREREQUISITE_FAILED: 'The household does not meet the dispatch prerequisites. Ask the backend team to check its status.',
    OUT_OF_JURISDICTION: 'The household must be within both your scope and the assigned caseworker\'s jurisdiction.',
    CALAMITY_MORATORIUM_ACTIVE: 'Dispatch is frozen: this municipality is under a declared calamity moratorium (RA 10121).',
  };
  return code && messages[code] ? messages[code] : '';
}
