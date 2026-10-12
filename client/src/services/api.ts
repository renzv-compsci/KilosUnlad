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
  AssessmentExplanation,
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

// Sealed model explanation for the triage drawer; null when none is sealed yet.
export async function fetchAssessmentExplanation(householdId: string, signal?: AbortSignal): Promise<AssessmentExplanation | null> {
  try {
    const response = await api.get(`/beneficiaries/${encodeURIComponent(householdId)}/assessment`, { signal });
    const data = response.data;
    if (!data || data.household_id !== householdId || !Array.isArray(data.shap_explainability)) {
      throw new Error('Assessment explanation response did not match the contract.');
    }
    return data as AssessmentExplanation;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error?.code === 'ASSESSMENT_NOT_FOUND') return null;
    throw error;
  }
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

export class DraftIncompleteError extends Error {
  code = 'DRAFT_INCOMPLETE';
}

// Maps a local draft to the frozen field-task-submission.json request. Local-only
// fields (living-condition scores, sync status, data URLs) are never sent. Each
// photo's storage_url is its content address, which the server binds to the hash.
export function toSubmissionContract(draft: FieldTaskSubmission) {
  const evidence = draft.evidence_attachments ?? [];
  const first = evidence[0];
  if (!draft.verified_swdi_level || !first) {
    throw new DraftIncompleteError('This saved report is missing the verified SWDI level or geotagged evidence. Reopen and save it again.');
  }
  return {
    task_id: draft.task_id,
    household_id: draft.household_id,
    verified_swdi_level: draft.verified_swdi_level,
    worker_recommendation: draft.worker_recommendation,
    narrative_report: draft.narrative_report,
    livelihood_asset_verification: {
      is_motorcycle_present: draft.is_motorcycle_present,
      is_productive_asset: draft.is_productive_asset,
      proof_type: draft.proof_type ?? 'NONE',
      franchise_number: draft.franchise_number ?? '',
    },
    landbank_card_inspection: {
      physical_card_presented: draft.physical_card_presented,
      card_matches_beneficiary: draft.card_matches_beneficiary,
      pawning_suspected: draft.pawning_suspected,
    },
    client_geolocation: {
      latitude: first.gps_readout.latitude,
      longitude: first.gps_readout.longitude,
      accuracy_meters: first.gps_readout.accuracy_m,
      captured_at: first.captured_at,
    },
    evidence_attachments: evidence.map((item) => ({
      media_type: /^data:(image\/(?:jpeg|png|webp));/.exec(item.photo_url)?.[1] ?? 'image/jpeg',
      storage_url: `${API_BASE_URL}/evidence/${item.client_side_hash}`,
      sha256_hash: item.client_side_hash,
      exif_metadata: { timestamp: item.captured_at, latitude: item.gps_readout.latitude, longitude: item.gps_readout.longitude },
    })),
  };
}

// Multipart so the server verifies (and stores) the original photo bytes.
export async function submitFieldTask(submission: FieldTaskSubmission): Promise<void> {
  const body = toSubmissionContract(submission);
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  for (const [index, item] of submission.evidence_attachments.entries()) {
    const blob = await (await fetch(item.photo_url)).blob();
    form.append('evidence_files', blob, `evidence-${index + 1}`);
  }
  await api.post(`/tasks/${encodeURIComponent(submission.task_id)}/submit`, form);
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
  if (code === 'ASSESSMENT_NOT_FOUND') return 'No sealed model assessment exists for this household yet.';
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
