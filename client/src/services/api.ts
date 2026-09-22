import axios from 'axios';
import {
  BeneficiaryTriageItem,
  FieldTaskItem,
  RiskSeverity,
  TriggerBadge,
  UserSession,
} from '../types/contracts';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('kilosunlad_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(username: string, password: string): Promise<UserSession> {
  const response = await api.post('/auth/login', { username, password });
  const payload = response.data?.data ?? response.data;
  const token = payload.access_token ?? payload.token ?? payload.accessToken;
  const user = payload.user ?? payload.session?.user;

  if (!token || !user) {
    throw new Error('Login response is missing access_token or user.');
  }

  sessionStorage.setItem('kilosunlad_access_token', token);

  return {
    access_token: token,
    user,
  };
}

export async function fetchTriageQueue(): Promise<BeneficiaryTriageItem[]> {
  const response = await api.get('/beneficiaries/triage-queue');
  const payload = response.data?.data ?? response.data;
  const items = payload.items ?? payload;

  if (!Array.isArray(items)) {
    throw new Error('Triage queue response did not include an items array.');
  }

  return items.map(normalizeTriageItem);
}

export async function fetchAssignedTasks(): Promise<FieldTaskItem[]> {
  const response = await api.get('/tasks/assigned');
  const payload = response.data?.data ?? response.data;
  const tasks = payload.tasks ?? payload.items ?? payload;

  if (!Array.isArray(tasks)) {
    throw new Error('Assigned tasks response did not include a tasks array.');
  }

  return tasks.map(normalizeFieldTask);
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
    last_evaluated: item.flagged_at ?? item.last_evaluated ?? new Date().toISOString(),
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
    dispatch_instructions: task.dispatch_instructions ?? 'Verify household conditions and beneficiary-provided evidence.',
    dispatched_at: task.dispatched_at ?? new Date().toISOString(),
    due_date: task.due_date ?? new Date().toISOString(),
    status: task.status ?? 'PENDING_VISIT',
    cached_offline: true,
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
  return String(value ?? 'Level 1: Survival');
}

function severityFromScore(score: number): RiskSeverity {
  if (score >= 80) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

function priorityFromScore(score?: number): FieldTaskItem['priority'] {
  if (!score) return 'MEDIUM';
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
