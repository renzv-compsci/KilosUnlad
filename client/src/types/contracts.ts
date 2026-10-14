export type UserRole = 'SUPER_ADMIN' | 'REGIONAL_DIRECTOR' | 'CASE_WORKER' | 'COA_AUDITOR';

export interface UserSession {
  access_token: string;
  expires_at: number;
  user: {
    user_id: string;
    username: string;
    full_name: string;
    role: UserRole;
    jurisdiction: {
      region: string;
      province: string;
      municipality: string;
      assigned_barangays?: string[];
    };
  };
}

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TriagePagination {
  total_records: number;
  current_page: number;
  total_pages: number;
  limit: number;
}

// GET /api/v1/beneficiaries/:household_id/assessment (admin-assessment-explanation.json)
export interface ShapIndicator {
  indicator: string;
  contribution_weight: number;
  description: string;
}

export interface AssessmentExplanation {
  household_id: string;
  evaluation_mode: 'ML_MODEL' | 'EVALUATED_VIA_FALLBACK';
  fallback_reason: string | null;
  predicted_swdi_level: number | null;
  class_probabilities: Record<string, number> | null;
  shap_explainability: ShapIndicator[];
  composite_risk_score: number | null;
  contributions: Record<string, number>;
  evaluated_at: string | null;
  sealed_at: string;
  audit_receipt: { sequence_index: number; entry_hash: string };
}

export type TriggerBadgeType = 
  | 'POWER_LIFELINE_BREACH' 
  | 'LTO_VEHICLE_MATCH' 
  | 'TIER_INVERSION' 
  | 'REAL_ESTATE_CROSSMATCH'
  | 'SANGLA_ATM_REPORT';

export interface TriggerBadge {
  type: TriggerBadgeType;
  label: string;
  detail: string;
  severity: 'danger' | 'warning' | 'info';
}

export interface BeneficiaryTriageItem {
  household_id: string;
  head_of_household: {
    first_name: string;
    last_name: string;
    full_name: string;
    national_id: string;
  };
  address: {
    region: string;
    province: string;
    municipality: string;
    barangay: string;
    sitio?: string;
    coordinates?: [number, number]; // [lon, lat]
  };
  enrolled_swdi_level: string; // e.g. "Level 1: Survival"
  predicted_swdi_level: string; // e.g. "Level 3: Self-Sufficient"
  composite_risk_score: number; // e.g. 84.0 / 100
  severity: RiskSeverity;
  status: 'PENDING_TRIAGE' | 'DISPATCHED' | 'UNDER_INVESTIGATION' | 'NOTICE_OF_INELIGIBILITY' | 'UNDER_APPEAL_HEARING' | 'GRADUATED';
  trigger_badges: TriggerBadge[];
  meralco_kwh_consumption?: number;
  lto_vehicle_record?: {
    plate_no: string;
    model: string;
    year: number;
    mv_type: string;
  };
  last_evaluated: string | null;
}

export interface DispatchTaskPayload {
  household_id: string;
  assigned_worker_id: string;
  assigned_worker_name: string;
  assignment_notes: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DueProcessNoticeItem {
  household_id: string;
  head_of_household: {
    full_name: string;
    national_id: string;
  };
  address: {
    barangay: string;
    municipality: string;
  };
  notice_date: string | null; // null when no approved notice record exists (live docket)
  notice_expiry_date: string | null; // 15-day statutory window
  status: 'NOTICE_OF_INELIGIBILITY' | 'UNDER_APPEAL_HEARING' | 'FINAL_REVOCATION';
  grant_continuation_active: boolean;
  appeal_docket_id?: string | null;
  hearing_date?: string | null;
  appeal_grounds?: string | null;
  initial_ineligibility_cause: string;
}

// POST /api/v1/appeals/docket (admin-appeal-filing.json)
export interface AppealFilingRequest {
  household_id: string;
  appeal_docket_id: string;
  hearing_date: string; // YYYY-MM-DD
  appeal_grounds: string;
}

export interface AppealFilingReceipt {
  appeal_docket_id: string;
  household_id: string;
  docket_status: 'UNDER_APPEAL_HEARING';
  notice_expiry_date: string;
  hearing_date: string;
  audit_receipt: { sequence_index: number; entry_hash: string };
}

export interface AuditBlock {
  sequence_index: number;
  timestamp: string;
  previous_entry_hash: string;
  entry_hash: string;
  actor: {
    username: string;
    role: string;
    ip_address: string;
  };
  action: 'MODEL_FLAG_RAISED' | 'TASK_DISPATCHED' | 'REPORT_SUBMITTED' | 'BENEFICIARY_GRADUATED' | 'BENEFICIARY_RETAINED'
    | 'APPEAL_FILED' | 'CALAMITY_DECLARED' | 'SYSTEM_CONFIG_UPDATED';
  household_id: string;
  state_delta: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  signature_verified: boolean;
}

export type WallConstructionScore = 1 | 2 | 3; // Light (1) / Mixed (2) / Concrete (3)
export type RoofConstructionScore = 1 | 2 | 3; // Makeshift (1) / Mixed (2) / Galvanized Iron (3)
export type WaterAccessScore = 1 | 2 | 3; // Point Source (1) / Communal (2) / Individual Meter (3)

export type LivelihoodProofType = 
  | 'MOVEIT' 
  | 'ANGKAS' 
  | 'TRICYCLE_MTOP' 
  | 'DELIVERY_LOGISTICS' 
  | 'PERSONAL_ONLY';

export type WorkerRecommendation = 
  | 'RETAIN' 
  | 'RECOMMEND_GRADUATION' 
  | 'INVESTIGATE_FRAUD';

export interface FieldTaskItem {
  task_id: string;
  household_id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  head_of_household: {
    first_name: string;
    last_name: string;
    full_name: string;
    national_id: string;
    contact_no?: string;
  };
  address: {
    sitio?: string;
    barangay: string;
    municipality: string;
    province: string;
    coordinates: [number, number];
  };
  dispatch_instructions: string;
  dispatched_at: string | null;
  due_date: string;
  status: 'PENDING_VISIT' | 'COMPLETED_OFFLINE' | 'SYNCED';
  cached_offline: boolean;
}

export interface FieldTaskSubmission {
  task_id: string;
  household_id: string;
  timestamp: string;
  // Section 1: Living Conditions
  wall_construction: WallConstructionScore;
  roof_construction: RoofConstructionScore;
  water_access: WaterAccessScore;
  
  // Section 2: Livelihood Asset Verification
  is_motorcycle_present: boolean;
  is_productive_asset: boolean;
  proof_type?: LivelihoodProofType;
  franchise_number?: string;
  
  // Section 3: Anti-Loan Shark Check (Sangla-ATM)
  physical_card_presented: boolean;
  card_matches_beneficiary: boolean;
  pawning_suspected: boolean;

  // Section 4: Geotagged Camera Capture
  evidence_attachments: {
    photo_url: string;
    thumbnail_url?: string;
    captured_at: string;
    gps_readout: {
      latitude: number;
      longitude: number;
      accuracy_m: number;
    };
    client_side_hash: string; // e.g. "SHA-256: a4f5...b201"
  }[];

  // Section 5: Final Recommendation & Narrative
  // Required by field-task-submission.json; optional only for legacy drafts.
  verified_swdi_level?: 1 | 2 | 3;
  worker_recommendation: WorkerRecommendation;
  narrative_report: string;
  
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'ERROR';
}
