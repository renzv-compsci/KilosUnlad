import { 
  BeneficiaryTriageItem, 
  DueProcessNoticeItem, 
  AuditBlock, 
  FieldTaskItem,
  UserSession 
} from '../types/contracts';

export const MOCK_USERS: Record<string, UserSession> = {
  director: {
    access_token: "jwt_token_dswd_dir_4a_99214a",
    user: {
      username: "dir.mendoza@dswd.gov.ph",
      full_name: "Atty. Carmelita Mendoza, CESO III",
      role: "DSWD_DIRECTOR",
      jurisdiction: {
        region: "Region IV-A (CALABARZON)",
        province: "Laguna",
        municipality: "Calamba Regional HQ"
      }
    }
  },
  municipal_link: {
    access_token: "jwt_token_ml_lag_3391",
    user: {
      username: "ml.bautista@dswd.gov.ph",
      full_name: "Marvin Bautista, RSW",
      role: "MUNICIPAL_LINK",
      jurisdiction: {
        region: "Region IV-A",
        province: "Laguna",
        municipality: "Calamba City",
        assigned_barangays: ["Barangay Makiling", "Barangay Canlubang", "Barangay Bucal"]
      }
    }
  },
  grievance_officer: {
    access_token: "jwt_token_gpo_lag_5521",
    user: {
      username: "appeal.castillo@dswd.gov.ph",
      full_name: "Rochelle Castillo, MSSW",
      role: "GRIEVANCE_OFFICER",
      jurisdiction: {
        region: "Region IV-A",
        province: "Laguna",
        municipality: "Regional Due Process Division",
        assigned_barangays: ["Laguna Cluster A", "Laguna Cluster B"]
      }
    }
  },
  coa_auditor: {
    access_token: "jwt_token_coa_inspector_812a",
    user: {
      username: "coa.santos@coa.gov.ph",
      full_name: "Engr. Roberto Santos, CPA, CISA",
      role: "COA_AUDITOR",
      jurisdiction: {
        region: "National Capital & IV-A",
        province: "Laguna Oversight",
        municipality: "Special Audit Unit"
      }
    }
  }
};

export const MOCK_TRIAGE_ITEMS: BeneficiaryTriageItem[] = [
  {
    household_id: "4PS-04A-2026-00129",
    head_of_household: {
      first_name: "Eduardo",
      last_name: "Dela Cruz",
      full_name: "Eduardo Dela Cruz",
      national_id: "PhilSys-9021-4412-8801"
    },
    address: {
      region: "Region IV-A",
      province: "Laguna",
      municipality: "Calamba City",
      barangay: "Barangay Canlubang",
      sitio: "Sitio Buntog",
      coordinates: [121.1422, 14.1950]
    },
    enrolled_swdi_level: "Level 1: Survival",
    predicted_swdi_level: "Level 3: Self-Sufficient",
    composite_risk_score: 84.0,
    severity: "CRITICAL",
    status: "PENDING_TRIAGE",
    meralco_kwh_consumption: 248.5,
    lto_vehicle_record: {
      plate_no: "ND-94812",
      model: "Yamaha NMAX 155cc",
      year: 2024,
      mv_type: "Motorcycle"
    },
    trigger_badges: [
      {
        type: "POWER_LIFELINE_BREACH",
        label: "Meralco > 200 kWh",
        detail: "3-Month Avg: 248.5 kWh (Lifeline max 100 kWh)",
        severity: "danger"
      },
      {
        type: "LTO_VEHICLE_MATCH",
        label: "Registered Motorcycle",
        detail: "2024 Yamaha NMAX (Valued @ ₱151,000)",
        severity: "warning"
      },
      {
        type: "TIER_INVERSION",
        label: "AI Predicted Level 3",
        detail: "SWDI Jump: Survival -> Self-Sufficient (+2 Tiers)",
        severity: "danger"
      }
    ],
    last_evaluated: "2026-09-20 18:42 PHT"
  },
  {
    household_id: "4PS-04A-2026-00341",
    head_of_household: {
      first_name: "Maria Theresa",
      last_name: "Villanueva",
      full_name: "Maria Theresa Villanueva",
      national_id: "PhilSys-3190-8821-0042"
    },
    address: {
      region: "Region IV-A",
      province: "Laguna",
      municipality: "Santa Rosa",
      barangay: "Barangay Sinalhan",
      sitio: "Purok 4",
      coordinates: [121.1180, 14.3160]
    },
    enrolled_swdi_level: "Level 1: Survival",
    predicted_swdi_level: "Level 2: Subsistence",
    composite_risk_score: 72.5,
    severity: "HIGH",
    status: "PENDING_TRIAGE",
    meralco_kwh_consumption: 215.0,
    lto_vehicle_record: {
      plate_no: "419-ABC",
      model: "Honda Wave 110",
      year: 2021,
      mv_type: "Motorcycle"
    },
    trigger_badges: [
      {
        type: "POWER_LIFELINE_BREACH",
        label: "Meralco > 200 kWh",
        detail: "Peak Aug: 215.0 kWh",
        severity: "danger"
      },
      {
        type: "LTO_VEHICLE_MATCH",
        label: "Registered Motorcycle",
        detail: "Honda Wave 110",
        severity: "warning"
      }
    ],
    last_evaluated: "2026-09-19 14:10 PHT"
  },
  {
    household_id: "4PS-04A-2026-00408",
    head_of_household: {
      first_name: "Rodolfo",
      last_name: "Aquino",
      full_name: "Rodolfo Aquino",
      national_id: "PhilSys-6651-2294-1189"
    },
    address: {
      region: "Region IV-A",
      province: "Laguna",
      municipality: "San Pedro",
      barangay: "Barangay Cuyab",
      sitio: "Riverside",
      coordinates: [121.0583, 14.3610]
    },
    enrolled_swdi_level: "Level 2: Subsistence",
    predicted_swdi_level: "Level 3: Self-Sufficient",
    composite_risk_score: 78.2,
    severity: "HIGH",
    status: "UNDER_INVESTIGATION",
    trigger_badges: [
      {
        type: "TIER_INVERSION",
        label: "AI Predicted Level 3",
        detail: "Household reported 2 OFW remittances",
        severity: "danger"
      },
      {
        type: "REAL_ESTATE_CROSSMATCH",
        label: "Assessor Match",
        detail: "Commercial stall titled to spouse",
        severity: "warning"
      }
    ],
    last_evaluated: "2026-09-18 09:30 PHT"
  },
  {
    household_id: "4PS-04A-2026-00512",
    head_of_household: {
      first_name: "Glenda",
      last_name: "Mercado",
      full_name: "Glenda Mercado",
      national_id: "PhilSys-1182-9903-4551"
    },
    address: {
      region: "Region IV-A",
      province: "Laguna",
      municipality: "Los Baños",
      barangay: "Barangay Batong Malake",
      coordinates: [121.2435, 14.1706]
    },
    enrolled_swdi_level: "Level 1: Survival",
    predicted_swdi_level: "Level 1: Survival",
    composite_risk_score: 52.0,
    severity: "MEDIUM",
    status: "DISPATCHED",
    trigger_badges: [
      {
        type: "SANGLA_ATM_REPORT",
        label: "Sangla-ATM Flag",
        detail: "Anonymous community tip via DSWD 8888 hotline",
        severity: "warning"
      }
    ],
    last_evaluated: "2026-09-17 11:20 PHT"
  },
  {
    household_id: "4PS-04A-2026-00620",
    head_of_household: {
      first_name: "Antonio",
      last_name: "Reyes",
      full_name: "Antonio Reyes",
      national_id: "PhilSys-7712-4091-6672"
    },
    address: {
      region: "Region IV-A",
      province: "Laguna",
      municipality: "Biñan City",
      barangay: "Barangay San Vicente",
      coordinates: [121.0834, 14.3385]
    },
    enrolled_swdi_level: "Level 1: Survival",
    predicted_swdi_level: "Level 1: Survival",
    composite_risk_score: 22.0,
    severity: "LOW",
    status: "PENDING_TRIAGE",
    trigger_badges: [],
    last_evaluated: "2026-09-20 16:15 PHT"
  }
];

export const MOCK_DUE_PROCESS_NOTICES: DueProcessNoticeItem[] = [
  {
    household_id: "4PS-04A-2025-08104",
    head_of_household: {
      full_name: "Danilo Ramos",
      national_id: "PhilSys-4412-0091-3829"
    },
    address: {
      barangay: "Barangay Turbina",
      municipality: "Calamba City"
    },
    notice_date: "2026-09-10",
    notice_expiry_date: "2026-09-25", // 15 days window
    status: "NOTICE_OF_INELIGIBILITY",
    grant_continuation_active: true,
    initial_ineligibility_cause: "High electrical consumption (340 kWh/mo) and validated commercial tricycle operation"
  },
  {
    household_id: "4PS-04A-2025-07993",
    head_of_household: {
      full_name: "Luzviminda Ocampo",
      national_id: "PhilSys-5510-8831-2914"
    },
    address: {
      barangay: "Barangay Dila",
      municipality: "Santa Rosa"
    },
    notice_date: "2026-09-08",
    notice_expiry_date: "2026-09-23",
    status: "UNDER_APPEAL_HEARING",
    grant_continuation_active: true,
    appeal_docket_id: "APP-CAL-2026-0042",
    hearing_date: "2026-09-28",
    appeal_grounds: "Unauthorized power line tapping by neighbor proven by Meralco inspection report; motorcycle is registered to sibling living separately.",
    initial_ineligibility_cause: "LTO registered passenger van cross-match and electric meter over 250 kWh"
  },
  {
    household_id: "4PS-04A-2025-06511",
    head_of_household: {
      full_name: "Crisanto Flores",
      national_id: "PhilSys-8812-7734-9011"
    },
    address: {
      barangay: "Barangay San Antonio",
      municipality: "Biñan City"
    },
    notice_date: "2026-09-07",
    notice_expiry_date: "2026-09-22",
    status: "NOTICE_OF_INELIGIBILITY",
    grant_continuation_active: true,
    initial_ineligibility_cause: "Family has achieved SWDI Level 3 Self-Sufficiency with documented stable formal employment in PEZA zone."
  }
];

export const MOCK_AUDIT_BLOCKS: AuditBlock[] = [
  {
    sequence_index: 10450,
    timestamp: "2026-09-21 08:14:02 UTC",
    previous_entry_hash: "0a8f9c1182...91ab4e",
    entry_hash: "3d9a1f28b49e01ea772093bf81da301e",
    actor: {
      username: "dir.mendoza@dswd.gov.ph",
      role: "DSWD_DIRECTOR",
      ip_address: "175.158.204.12"
    },
    action: "BENEFICIARY_GRADUATED",
    household_id: "4PS-04A-2025-01192",
    signature_verified: true,
    state_delta: {
      before: {
        status: "NOTICE_OF_INELIGIBILITY",
        swdi_level: "Level 3: Self-Sufficient",
        grant_disbursement: "ACTIVE_4PS_MONTHLY"
      },
      after: {
        status: "GRADUATED_KILOS_UNLAD",
        swdi_level: "Level 3: Self-Sufficient",
        grant_disbursement: "TERMINATED_SUSTAINED_EXIT",
        sustainable_livelihood_grant: "AWARDED_SEED_CAPITAL_PHP15000"
      }
    }
  },
  {
    sequence_index: 10451,
    timestamp: "2026-09-21 09:22:15 UTC",
    previous_entry_hash: "3d9a1f28b49e01ea772093bf81da301e",
    entry_hash: "7f4c1e89b022718cd9912048aaef4910",
    actor: {
      username: "ml.bautista@dswd.gov.ph",
      role: "MUNICIPAL_LINK",
      ip_address: "112.198.118.88"
    },
    action: "TASK_DISPATCHED",
    household_id: "4PS-04A-2026-00129",
    signature_verified: true,
    state_delta: {
      before: {
        status: "PENDING_TRIAGE",
        assigned_worker_id: null
      },
      after: {
        status: "DISPATCHED",
        assigned_worker_id: "ML-CALAMBA-019",
        priority: "CRITICAL",
        due_date: "2026-10-05"
      }
    }
  },
  {
    sequence_index: 10452,
    timestamp: "2026-09-21 10:05:40 UTC",
    previous_entry_hash: "7f4c1e89b022718cd9912048aaef4910",
    entry_hash: "c981ab20948e918237bba891f0928aa1",
    actor: {
      username: "dir.mendoza@dswd.gov.ph",
      role: "DSWD_DIRECTOR",
      ip_address: "175.158.204.12"
    },
    action: "APPEAL_FILED",
    household_id: "4PS-04A-2025-07993",
    signature_verified: true,
    state_delta: {
      before: {
        status: "NOTICE_OF_INELIGIBILITY",
        countdown_active: true
      },
      after: {
        status: "UNDER_APPEAL_HEARING",
        appeal_docket_id: "APP-CAL-2026-0042",
        countdown_paused: true,
        hearing_date: "2026-09-28"
      }
    }
  }
];

export const MOCK_FIELD_TASKS: FieldTaskItem[] = [
  {
    task_id: "TSK-LAG-2026-0091",
    household_id: "4PS-04A-2026-00129",
    priority: "HIGH",
    head_of_household: {
      first_name: "Eduardo",
      last_name: "Dela Cruz",
      full_name: "Eduardo Dela Cruz",
      national_id: "PhilSys-9021-4412-8801",
      contact_no: "0917-554-9921"
    },
    address: {
      sitio: "Sitio Buntog",
      barangay: "Barangay Canlubang",
      municipality: "Calamba City",
      province: "Laguna",
      coordinates: [121.1422, 14.1950]
    },
    dispatch_instructions: "Check if Yamaha NMAX is used for MoveIt delivery; verify physical custody of LandBank card.",
    dispatched_at: "2026-09-20 09:00",
    due_date: "2026-10-04",
    status: "PENDING_VISIT",
    cached_offline: true
  },
  {
    task_id: "TSK-LAG-2026-0094",
    household_id: "4PS-04A-2026-00512",
    priority: "CRITICAL",
    head_of_household: {
      first_name: "Glenda",
      last_name: "Mercado",
      full_name: "Glenda Mercado",
      national_id: "PhilSys-1182-9903-4551",
      contact_no: "0928-331-4820"
    },
    address: {
      sitio: "Purok 2",
      barangay: "Barangay Batong Malake",
      municipality: "Los Baños",
      province: "Laguna",
      coordinates: [121.2435, 14.1706]
    },
    dispatch_instructions: "Inquire about reported pawned LandBank 4Ps cash card to local micro-lender; check physical card presence.",
    dispatched_at: "2026-09-19 14:30",
    due_date: "2026-10-03",
    status: "PENDING_VISIT",
    cached_offline: true
  },
  {
    task_id: "TSK-LAG-2026-0102",
    household_id: "4PS-04A-2026-00341",
    priority: "MEDIUM",
    head_of_household: {
      first_name: "Maria Theresa",
      last_name: "Villanueva",
      full_name: "Maria Theresa Villanueva",
      national_id: "PhilSys-3190-8821-0042",
      contact_no: "0908-112-9944"
    },
    address: {
      sitio: "Purok 4",
      barangay: "Barangay Sinalhan",
      municipality: "Santa Rosa",
      province: "Laguna",
      coordinates: [121.1180, 14.3160]
    },
    dispatch_instructions: "Verify household electricity meter wiring and determine if Honda motorcycle is shared livelihood asset.",
    dispatched_at: "2026-09-18 16:00",
    due_date: "2026-10-02",
    status: "COMPLETED_OFFLINE",
    cached_offline: true
  }
];

export const MOCK_MUNICIPAL_LINKS = [
  { id: "ML-CALAMBA-019", name: "Marvin Bautista, RSW", area: "Canlubang, Bucal, Makiling" },
  { id: "ML-CALAMBA-022", name: "Jocelyn Alcantara, RSW", area: "Palingon, Turbina, Real" },
  { id: "ML-STAROSA-008", name: "Rhea Mae Santos, RSW", area: "Sinalhan, Tagapo, Balibago" },
  { id: "ML-LOSBANOS-005", name: "Gabriel De Silva, RSW", area: "Batong Malake, Bayog, Mayondon" }
];
