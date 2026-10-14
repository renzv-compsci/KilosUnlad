import axios from 'axios';
import { clearStoredSession, parseSession, readStoredSession, saveSession } from './authSession';
import { calculateSha256 } from '../utils/photoHasher';
import {
  BeneficiaryTriageItem,
  FieldTaskItem,
  RiskSeverity,
  TriggerBadge,
  UserSession,
  FieldTaskSubmission,
  TriagePagination,
  AssessmentExplanation,
  AppealFilingReceipt,
  AppealFilingRequest,
  DueProcessNoticeItem,
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

export async function fetchTriagePage(page = 1, signal?: AbortSignal, status = 'FLAGGED_FOR_REVIEW', limit = 10): Promise<{ items: BeneficiaryTriageItem[]; pagination: TriagePagination; summary: TriageSummary | null }> {
  const response = await api.get('/beneficiaries/triage-queue', {
    signal, params: { page, limit, status },
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

// INT-08: live due-process docket (admin-due-process-docket.json).
export async function fetchDueProcessDocket(signal?: AbortSignal): Promise<DueProcessNoticeItem[]> {
  const response = await api.get('/appeals/docket', { params: { limit: 100 }, signal });
  if (!Array.isArray(response.data?.items)) throw new Error('Due process docket response did not include an items array.');
  return response.data.items as DueProcessNoticeItem[];
}

// INT-08: files a formal appeal (admin-appeal-filing.json).
export async function fileAppeal(body: AppealFilingRequest): Promise<AppealFilingReceipt> {
  const response = await api.post('/appeals/docket', body);
  return response.data as AppealFilingReceipt;
}

export function appealErrorMessage(error: unknown): string {
  const code = axios.isAxiosError(error) ? error.response?.data?.error?.code : undefined;
  const messages: Record<string, string> = {
    INVALID_REQUEST: 'Check the fields: docket reference (letters, digits, hyphens), a valid hearing date and at least 10 characters of grounds.',
    INVALID_HEARING_DATE: 'The hearing date cannot be earlier than today.',
    NOTICE_REQUIRED: 'This household is no longer under a Notice of Ineligibility. Refresh the list.',
    NOTICE_RECORD_MISSING: 'No approved notice record exists for this household, so no appeal window can be computed.',
    APPEAL_WINDOW_CLOSED: 'The 15-day appeal window has already elapsed.',
    APPEAL_ALREADY_FILED: 'An appeal is already docketed for this notice. Refresh the list.',
    DOCKET_ID_CONFLICT: 'That docket reference is already used by another appeal.',
  };
  return (code && messages[code]) || apiErrorMessage(error);
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

// ---- UI live data (DECISION-010): read-only routes for the dashboards ----
export interface InsightsOverview {
  generated_at: string;
  households: { total: number; by_status: Record<string, number>; by_enrolled_level: Record<string, number> };
  risk: { flag_threshold: number; high_risk: number; critical: number; high: number; below_threshold: number;
    average_flagged_score: number | null; triggers: { code: string; label: string; count: number }[] };
  municipalities: { province: string; municipality: string; households: number; flagged: number; under_investigation: number;
    notice: number; graduated: number; high_risk: number; average_flagged_score: number | null; centroid: [number, number] | null;
    calamity_active: boolean; top_triggers: { code: string; count: number }[] }[];
  tasks: { total: number; by_status: Record<string, number>; average_turnaround_hours: number | null;
    workers: { user_id: string; full_name: string; open: number; submitted: number; verified: number }[] };
  due_process: { notices: number; appeals_filed: number };
  calamity: { active_zones: CalamityZone[] };
  audit: { total_blocks: number; last_sequence_index: number | null; last_timestamp: string | null; by_action: Record<string, number> } | null;
}
export interface CalamityZone { province: string; municipality: string; declared_at: string | null; expires_at: string | null; ndrrmc_reference: string | null; is_active?: boolean }
export interface AdminTaskItem {
  task_id: string; household_id: string; head_of_household: { full_name: string }; address: { barangay: string; municipality: string };
  task_status: string; priority: string; due_date: string | null; dispatched_at: string | null; updated_at: string | null;
  assigned_worker: { user_id: string; full_name: string } | null; composite_risk_score: number;
}
export interface CaseworkerItem { user_id: string; full_name: string; username: string;
  jurisdiction: { province: string | null; municipality: string | null; assigned_barangays: string[] }; open_tasks: number }
export interface AuditBlockHeader { sequence_index: number; timestamp: string; action: string; actor: { username: string; role: string };
  target_entity: { collection_name: string; entity_id: string }; previous_entry_hash: string; entry_hash: string }
export interface PolicySnapshot {
  risk_score: { flag_threshold: number; weights: Record<string, number>; cap: number };
  lifeline_limits: { power_kwh_per_month: number; water_cu_m_per_month: number };
  field_verification: { geofence_radius_m: number };
  due_process: { appeal_window_days: number };
  age_out: { eligible_until_age: number; timezone: string };
  sangla_atm: { max_swipe_interval_seconds: number; nocturnal_start_hour: number; nocturnal_end_hour: number; cluster_repeat_ratio: number };
  calamity_zones: CalamityZone[];
}

export async function fetchInsightsOverview(signal?: AbortSignal): Promise<InsightsOverview> {
  const { data } = await api.get('/insights/overview', { signal });
  if (!data?.households || !data?.risk || !Array.isArray(data?.municipalities)) throw new Error('Overview response did not match the contract.');
  return data as InsightsOverview;
}

export async function fetchAdminTasks(params: { status?: string; page?: number; limit?: number } = {}, signal?: AbortSignal):
  Promise<{ items: AdminTaskItem[]; pagination: TriagePagination }> {
  const { data } = await api.get('/tasks', { params, signal });
  if (!Array.isArray(data?.items) || !data?.pagination) throw new Error('Task list response did not match the contract.');
  return data;
}

export async function fetchCaseworkers(signal?: AbortSignal): Promise<CaseworkerItem[]> {
  const { data } = await api.get('/users/caseworkers', { signal });
  if (!Array.isArray(data?.items)) throw new Error('Case worker directory response did not match the contract.');
  return data.items;
}

export async function fetchAuditBlocks(params: { limit?: number; before?: number } = {}, signal?: AbortSignal):
  Promise<{ items: AuditBlockHeader[]; total_blocks: number; next_before: number | null }> {
  const { data } = await api.get('/audit/blocks', { params, signal });
  if (!Array.isArray(data?.items)) throw new Error('Audit block response did not match the contract.');
  return data;
}

export async function fetchPolicy(signal?: AbortSignal): Promise<PolicySnapshot> {
  const { data } = await api.get('/system/policy', { signal });
  if (!data?.risk_score) throw new Error('Policy response did not match the contract.');
  return data as PolicySnapshot;
}

export interface MapDensity { generated_at: string; cell_size_deg: number; total_households: number;
  cells: { center: [number, number]; households: number; active_compliant: number; under_review: number }[] }

// Household counts per map cell for the dashboard map (admin-map-density.json).
export async function fetchMapDensity(signal?: AbortSignal): Promise<MapDensity> {
  const { data } = await api.get('/insights/map', { signal });
  if (!Array.isArray(data?.cells) || !Number.isSafeInteger(data?.total_households)) throw new Error('Map response did not match the contract.');
  return data as MapDensity;
}

// ---- DECISION-011: report review, evidence photos, notice issuance, graduation ----
export interface TaskReport {
  task_id: string; household_id: string; head_of_household: { full_name: string }; address: { barangay: string; municipality: string };
  task_status: string; household_status: string; assigned_worker: { user_id: string; full_name: string } | null; submitted_at: string | null;
  findings: { verified_swdi_level: number | null; worker_recommendation: string | null; narrative_report: string;
    livelihood_asset_verification: { is_motorcycle_present?: boolean; is_productive_asset?: boolean; proof_type?: string; franchise_number?: string } | null;
    landbank_card_inspection: { physical_card_presented?: boolean; card_matches_beneficiary?: boolean; pawning_suspected?: boolean } | null;
    client_geolocation: { latitude: number; longitude: number; accuracy_meters: number | null; captured_at: string | null } | null };
  evidence: { sha256_hash: string; media_type: string; captured_at: string | null; url: string }[];
  graduation_supported: boolean;
  retention_supported: boolean;
  admin_resolution: { decision: string; admin_notes: string; finalized_at: string | null } | null;
}
export interface NoticeReceipt { task_id: string; household_id: string; task_status: string; household_status: string;
  notice_date: string; appeal_deadline: string; audit_receipt: { sequence_index: number; entry_hash: string } }
// DECISION-012: retention after a field visit, and the outcome of an appeal hearing.
export interface RetentionReceipt { task_id: string; household_id: string; task_status: string; household_status: string;
  retained_at: string; reassessment_allowed_from: string; audit_receipt: { sequence_index: number; entry_hash: string } }
export interface AppealDecisionReceipt { appeal_docket_id: string; household_id: string; outcome: 'GRANTED' | 'DENIED';
  household_status: string; decided_at: string; reassessment_allowed_from: string | null;
  audit_receipt: { sequence_index: number; entry_hash: string } }
export interface GraduationReceipt { household_id: string; household_status: string; notice_date: string; appeal_deadline: string;
  audit_receipt: { sequence_index: number; entry_hash: string } }

export async function fetchTaskReport(taskId: string, signal?: AbortSignal): Promise<TaskReport> {
  const { data } = await api.get(`/tasks/${encodeURIComponent(taskId)}/report`, { signal });
  if (data?.task_id !== taskId || !Array.isArray(data?.evidence)) throw new Error('Report response did not match the contract.');
  return data as TaskReport;
}

// Evidence is fetched with the session token and shown from an in-memory object URL. The
// browser re-hashes the received bytes itself (when it can) and also checks the server's
// confirmation header, so a photo is shown only if it matches its recorded hash.
export async function fetchEvidenceUrl(hash: string, signal?: AbortSignal): Promise<string> {
  const response = await api.get(`/evidence/${encodeURIComponent(hash)}`, { signal, responseType: 'blob' });
  const blob = response.data as Blob;
  const confirmed = response.headers['x-content-sha256'];
  if (globalThis.crypto?.subtle) {
    if (await calculateSha256(blob) !== hash) throw new Error('The photo does not match its recorded hash.');
  } else if (confirmed !== hash) {
    throw new Error('The server did not confirm the photo hash.');
  }
  return URL.createObjectURL(blob);
}

export async function issueNotice(taskId: string, adminNotes: string): Promise<NoticeReceipt> {
  const { data } = await api.post(`/tasks/${encodeURIComponent(taskId)}/resolve`, { decision: 'APPROVED_GRADUATION', admin_notes: adminNotes });
  if (data?.household_status !== 'NOTICE_OF_INELIGIBILITY' || !Number.isSafeInteger(data?.audit_receipt?.sequence_index)) {
    throw new Error('The server did not return a valid notice receipt.');
  }
  return data as NoticeReceipt;
}

export async function completeGraduation(householdId: string): Promise<GraduationReceipt> {
  const { data } = await api.post(`/beneficiaries/${encodeURIComponent(householdId)}/graduate`, {});
  if (data?.household_status !== 'GRADUATED' || !Number.isSafeInteger(data?.audit_receipt?.sequence_index)) {
    throw new Error('The server did not return a valid graduation receipt.');
  }
  return data as GraduationReceipt;
}

export async function retainHousehold(taskId: string, adminNotes: string): Promise<RetentionReceipt> {
  const { data } = await api.post(`/tasks/${encodeURIComponent(taskId)}/retain`, { admin_notes: adminNotes });
  if (data?.household_status !== 'ACTIVE_COMPLIANT' || !Number.isSafeInteger(data?.audit_receipt?.sequence_index)) {
    throw new Error('The server did not return a valid retention receipt.');
  }
  return data as RetentionReceipt;
}

export async function decideAppeal(docketId: string, outcome: 'GRANTED' | 'DENIED', decisionNotes: string): Promise<AppealDecisionReceipt> {
  const { data } = await api.post(`/appeals/${encodeURIComponent(docketId)}/decide`, { outcome, decision_notes: decisionNotes });
  const expected = outcome === 'GRANTED' ? 'ACTIVE_COMPLIANT' : 'GRADUATED';
  if (data?.household_status !== expected || !Number.isSafeInteger(data?.audit_receipt?.sequence_index)) {
    throw new Error('The server did not return a valid hearing outcome receipt.');
  }
  return data as AppealDecisionReceipt;
}

export function resolutionErrorMessage(error: unknown): string {
  const code = axios.isAxiosError(error) ? error.response?.data?.error?.code : undefined;
  const messages: Record<string, string> = {
    INVALID_REQUEST: 'Write the grounds for your decision (at least 10 characters).',
    TASK_NOT_SUBMITTED: 'This report was already decided. Refresh the list.',
    FIELD_REPORT_DOES_NOT_SUPPORT_GRADUATION: 'The field report neither recommends graduation nor verifies Level 3, so a notice cannot be issued.',
    CALAMITY_MORATORIUM_ACTIVE: 'A calamity moratorium (RA 10121) covers this municipality: notices and graduation are frozen.',
    WORKFLOW_CONFLICT: 'The household status changed. Refresh and try again.',
    NOTICE_RECORD_MISSING: 'No approved notice is on record for this household.',
    APPEAL_WINDOW_OPEN: 'The 15-day appeal window has not ended yet.',
    APPEAL_HOLD: 'An appeal was filed, so the household cannot be graduated.',
    EVIDENCE_INTEGRITY_FAILED: 'This photo no longer matches its recorded hash and was not shown.',
    EVIDENCE_NOT_FOUND: 'The photo is not in storage.',
    FIELD_REPORT_DOES_NOT_SUPPORT_RETENTION: 'The field report neither recommends retention nor verifies Level 1 or 2.',
    APPEAL_NOT_FOUND: 'No appeal with this docket reference is on record.',
    APPEAL_NOT_CURRENT: 'This appeal was filed against an earlier notice.',
    HEARING_NOT_YET_HELD: 'The outcome can be recorded on or after the hearing date.',
    AUDIT_ENTRY_INVALID: 'The appeal record failed its hash check. Ask the COA auditor to verify the ledger.',
    RETENTION_COOLDOWN: 'This household was kept on the program recently and cannot be reassessed yet.',
  };
  return (code && messages[code]) || apiErrorMessage(error);
}
