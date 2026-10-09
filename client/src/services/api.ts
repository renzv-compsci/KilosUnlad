import axios from 'axios';
import { clearStoredSession, parseSession, readStoredSession, saveSession } from './authSession';
import {
  BeneficiaryTriageItem,
  FieldTaskItem,
  RiskSeverity,
  TriggerBadge,
  UserSession,
  FieldTaskSubmission,
  TriagePagination,
} from '../types/contracts';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  if (config.url === '/auth/login') {
    delete config.headers.Authorization;
    return config;
  }
  const session = readStoredSession();
  if (!session) {
    window.dispatchEvent(new Event('kilosunlad:unauthorized'));
    throw new Error('Please sign in to continue.');
  }
  config.headers.Authorization = `Bearer ${session.access_token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = readStoredSession()?.access_token;
    if (error.config?.url !== '/auth/login' && token &&
        error.config?.headers?.Authorization === `Bearer ${token}` &&
        (error.response?.status === 401 || error.response?.data?.error?.code === 'ACCOUNT_DEACTIVATED')) {
      clearStoredSession();
      window.dispatchEvent(new Event('kilosunlad:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export async function login(username: string, password: string): Promise<UserSession> {
  clearStoredSession();
  const response = await api.post('/auth/login', { username, password });
  const payload = response.data?.data ?? response.data;
  if (response.headers['x-kilosunlad-mock'] === 'true') throw new Error('Disable backend Phase 1 mock mode before signing in.');
  const session = parseSession(payload);
  saveSession(session);
  return session;
}

export async function fetchTriageQueue(signal?: AbortSignal): Promise<BeneficiaryTriageItem[]> {
  return (await fetchTriagePage(1, signal)).items;
}

export interface TriageSummary {
  high_risk_count: number;
  under_investigation_count: number;
  notice_of_ineligibility_count: number;
}

export function parseTriageSummary(value: unknown): TriageSummary | null {
  if (!value || typeof value !== 'object') return null;
  const summary = value as TriageSummary;
  return [summary.high_risk_count, summary.under_investigation_count, summary.notice_of_ineligibility_count]
    .every(count => Number.isSafeInteger(count) && count >= 0) ? summary : null;
}

export async function fetchTriagePage(page = 1, signal?: AbortSignal): Promise<{ items: BeneficiaryTriageItem[]; pagination: TriagePagination; summary: TriageSummary | null }> {
  const response = await api.get('/beneficiaries/triage-queue', {
    signal, params: { page, limit: 10, status: 'FLAGGED_FOR_REVIEW' },
  });
  const payload = response.data?.data ?? response.data;
  const items = payload.items ?? payload;

  if (!Array.isArray(items)) {
    throw new Error('Triage queue response did not include an items array.');
  }

  const pagination = payload.pagination;
  if (!pagination || !Number.isSafeInteger(pagination.total_records) || pagination.total_records < 0 ||
      !Number.isSafeInteger(pagination.current_page) || pagination.current_page !== page ||
      !Number.isSafeInteger(pagination.total_pages) || pagination.total_pages < 0 ||
      !Number.isSafeInteger(pagination.limit) || pagination.limit < 1) {
    throw new Error('Triage queue response did not include valid pagination.');
  }
  return { items: items.map(normalizeTriageItem), pagination, summary: parseTriageSummary(payload.summary_metrics) };
}

export async function fetchAssignedTasks(signal?: AbortSignal): Promise<FieldTaskItem[]> {
  const response = await api.get('/tasks/assigned', { signal });
  const payload = response.data?.data ?? response.data;
  const tasks = payload.tasks ?? payload.items ?? payload;

  if (!Array.isArray(tasks)) {
    throw new Error('Assigned tasks response did not include a tasks array.');
  }

  return tasks.map(normalizeFieldTask);
}

export async function submitFieldTask(submission: FieldTaskSubmission): Promise<void> {
  await api.post(`/tasks/${encodeURIComponent(submission.task_id)}/submit`, submission);
}

export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : 'The request could not be completed.';
  if (!error.response) return 'Cannot reach the API. Check that the backend is running and its CORS origin matches this frontend.';
  const code = error.response.data?.error?.code;
  if (code === 'ACCOUNT_DEACTIVATED') return 'This account is inactive. Contact your administrator.';
  if (error.response.status === 401) return error.config?.url === '/auth/login' ? 'Incorrect username or password.' : 'Your session expired. Please sign in again.';
  if (code === 'OUT_OF_JURISDICTION') return 'Access denied: this request is outside your assigned jurisdiction.';
  if (error.response.status === 403) return 'Access denied for your role or jurisdiction.';
  if (code === 'ENDPOINT_NOT_READY') return 'This backend endpoint is not available yet.';
  if (code === 'AUDIT_RANGE_INCOMPLETE') return 'The requested range or its preceding block is missing. Confirm an existing range with the backend team.';
  if (code === 'AUDIT_ENTRY_INVALID') return 'An audit entry could not be verified. Ask the backend team to inspect the entry.';
  if (code === 'INVALID_QUERY') return 'Enter a valid inclusive sequence range of up to 1,000 blocks.';
  if (error.response.status === 404) return 'This endpoint is unavailable on the running backend version.';
  if (error.response.status >= 500) return 'The backend service is unavailable. Please try again later.';
  return 'The request could not be completed. Please try again.';
}

function normalizeTriageItem(item: any): BeneficiaryTriageItem {
  const score = Number(item.composite_risk_score ?? item.risk_score ?? 0);
  return {
    household_id: item.household_id,
    head_of_household: {
      first_name: item.head_of_household?.first_name ?? firstName(item.head_of_household?.full_name),
      last_name: item.head_of_household?.last_name ?? lastName(item.head_of_household?.full_name),
      full_name: item.head_of_household?.full_name ?? 'Unknown Beneficiary',
      national_id: item.head_of_household?.national_id ?? 'PhilSys-****-****-0000',
    },
    address: {
      region: item.address?.region ?? 'Region IV-A',
      province: item.address?.province ?? 'Laguna',
      municipality: item.address?.municipality ?? 'Unknown Municipality',
      barangay: item.address?.barangay ?? 'Unknown Barangay',
      sitio: item.address?.sitio,
      coordinates: item.address?.coordinates,
    },
    enrolled_swdi_level: swdiLabel(item.enrolled_swdi_level),
    predicted_swdi_level: swdiLabel(item.predicted_swdi_level),
    composite_risk_score: score,
    severity: severityFromScore(score),
    status: item.program_status ?? item.status ?? 'PENDING_TRIAGE',
    trigger_badges: normalizeTriggerBadges(item.trigger_badges),
    meralco_kwh_consumption: item.meralco_kwh_consumption,
    lto_vehicle_record: item.lto_vehicle_record,
    last_evaluated: item.flagged_at ?? item.last_evaluated ?? null,
  };
}

function normalizeFieldTask(task: any): FieldTaskItem {
  return {
    task_id: task.task_id,
    household_id: task.household_id,
    priority: priorityFromScore(task.risk_assessment?.composite_risk_score),
    head_of_household: {
      first_name: task.head_of_household?.first_name ?? firstName(task.head_of_household?.full_name),
      last_name: task.head_of_household?.last_name ?? lastName(task.head_of_household?.full_name),
      full_name: task.head_of_household?.full_name ?? `${task.head_of_household?.first_name ?? ''} ${task.head_of_household?.last_name ?? ''}`.trim(),
      national_id: task.head_of_household?.national_id ?? 'PhilSys-****-****-0000',
      contact_no: task.head_of_household?.contact_phone ?? task.head_of_household?.contact_no,
    },
    address: {
      sitio: task.address?.street ?? task.address?.sitio,
      barangay: task.address?.barangay ?? 'Unknown Barangay',
      municipality: task.address?.municipality ?? 'Unknown Municipality',
      province: task.address?.province ?? 'Laguna',
      coordinates: task.address?.target_coordinates ?? task.address?.coordinates ?? [0, 0],
    },
    dispatch_instructions: task.dispatch_instructions ?? '',
    dispatched_at: task.dispatched_at ?? null,
    due_date: task.due_date ?? '',
    status: task.status ?? 'PENDING_VISIT',
    cached_offline: false,
  };
}

function normalizeTriggerBadges(badges: any[] = []): TriggerBadge[] {
  return badges.map((badge) => ({
    type: badge.type ?? badge.code ?? 'TIER_INVERSION',
    label: badge.label ?? badge.code ?? 'Flagged Trigger',
    detail: badge.detail ?? badge.label ?? 'Backend supplied trigger',
    severity:
      badge.severity === 'CRITICAL' || badge.severity === 'HIGH'
        ? 'danger'
        : badge.severity === 'MEDIUM'
          ? 'warning'
          : badge.severity ?? 'info',
  }));
}

function swdiLabel(value: unknown): string {
  if (typeof value === 'number') {
    if (value === 1) return 'Level 1: Survival';
    if (value === 2) return 'Level 2: Subsistence';
    if (value === 3) return 'Level 3: Self-Sufficient';
  }
  return value === null || value === undefined || value === '' ? 'Not available' : String(value);
}

function severityFromScore(score: number): RiskSeverity {
  if (score >= 80) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

function priorityFromScore(score?: number): FieldTaskItem['priority'] {
  if (score === undefined || !Number.isFinite(score)) return 'MEDIUM';
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

function firstName(value?: string): string {
  return value?.split(' ')[0] ?? 'Unknown';
}

function lastName(value?: string): string {
  const parts = value?.split(' ') ?? [];
  return parts.slice(1).join(' ') || 'Beneficiary';
}
