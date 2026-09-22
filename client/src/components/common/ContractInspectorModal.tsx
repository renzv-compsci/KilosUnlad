import React from 'react';
import { ScreenId, SCREEN_CONFIGS } from './WireframeToolbar';
import { X, Copy, Check, FileJson, Link2, BookOpen, Layers } from 'lucide-react';

interface ContractInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: ScreenId;
}

export const ContractInspectorModal: React.FC<ContractInspectorModalProps> = ({
  isOpen,
  onClose,
  activeScreen,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const getContractDetails = (screen: ScreenId) => {
    switch (screen) {
      case 'login':
        return {
          contractFile: '/docs/contracts/auth/auth-session.json',
          endpoint: 'POST /api/v1/auth/login',
          description: 'Multi-role authentication for Regional Directors, Municipal Links, and COA Auditors. Emits JWT and jurisdiction scope.',
          variables: [
            { name: 'username', type: 'string', desc: 'Government email (e.g., dir.mendoza@dswd.gov.ph)' },
            { name: 'password', type: 'string (hidden)', desc: 'User password with toggle visibility' },
            { name: 'access_token', type: 'string (JWT)', desc: 'Saved in memory upon success' },
            { name: 'user.full_name', type: 'string', desc: 'Rendered in top header profile' },
            { name: 'user.role', type: "'DSWD_DIRECTOR' | 'MUNICIPAL_LINK' | 'COA_AUDITOR'", desc: 'Determines permission gates' },
            { name: 'user.jurisdiction.municipality', type: 'string', desc: 'Assigned regional/municipal cluster' }
          ],
          jsonPayload: {
            request: {
              username: "dir.mendoza@dswd.gov.ph",
              password: "••••••••••••"
            },
            response_200: {
              access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              token_type: "Bearer",
              user: {
                username: "dir.mendoza@dswd.gov.ph",
                full_name: "Atty. Carmelita Mendoza, CESO III",
                role: "DSWD_DIRECTOR",
                jurisdiction: {
                  region: "Region IV-A",
                  province: "Laguna",
                  municipality: "Calamba Regional HQ"
                }
              }
            }
          }
        };

      case 'dashboard':
        return {
          contractFile: '/docs/contracts/admin-web/admin-triage-feed.json + system_configs',
          endpoint: 'GET /api/v1/dashboard/summary',
          description: 'Executive caseload summary, RA 10121 calamity freeze status, and Laguna geospatial pin coordinate feed.',
          variables: [
            { name: 'active_beneficiaries_count', type: 'number', desc: 'Total regional active 4Ps households (4,850)' },
            { name: 'high_risk_count', type: 'number', desc: 'Flagged for Review where Si >= 70 (32)' },
            { name: 'under_investigation_count', type: 'number', desc: 'Investigations dispatched to field (12)' },
            { name: 'notice_of_ineligibility_count', type: 'number', desc: 'Graduated / Ineligibility notices (4)' },
            { name: 'calamity_moratorium', type: 'object', desc: 'RA 10121 disaster declaration freeze status' },
            { name: 'map_pins[].coordinates', type: '[lon, lat]', desc: 'Geocoded Laguna coordinates [121.1652, 14.2144]' }
          ],
          jsonPayload: {
            active_beneficiaries_count: 4850,
            high_risk_count: 32,
            under_investigation_count: 12,
            notice_of_ineligibility_count: 4,
            calamity_freeze: {
              active: true,
              municipality: "Calamba City",
              valid_until: "2026-10-24",
              statutory_basis: "RA 10121 NDRRMC Res. 2026-04"
            },
            laguna_clusters: [
              { municipality: "Calamba", risk_count: 14, coords: [121.1652, 14.2144] },
              { municipality: "Santa Rosa", risk_count: 8, coords: [121.1180, 14.3160] },
              { municipality: "San Pedro", risk_count: 6, coords: [121.0583, 14.3610] }
            ]
          }
        };

      case 'triage':
        return {
          contractFile: '/docs/contracts/admin-web/admin-triage-feed.json',
          endpoint: 'GET /api/v1/beneficiaries/triage-queue',
          description: 'High-density flagged triage list comparing enrolled SWDI vs predicted SWDI with composite risk gauge and trigger badges.',
          variables: [
            { name: 'household_id', type: 'string', desc: 'e.g. 4PS-04A-2026-00129' },
            { name: 'head_of_household.full_name', type: 'string', desc: 'Full legal name with national_id subtext' },
            { name: 'address.barangay + address.municipality', type: 'string', desc: 'Jurisdictional location' },
            { name: 'enrolled_swdi_level', type: 'string', desc: 'Baseline SWDI level (e.g. Level 1: Survival)' },
            { name: 'predicted_swdi_level', type: 'string', desc: 'AI predicted SWDI level (e.g. Level 3: Self-Sufficient)' },
            { name: 'composite_risk_score', type: 'number (0-100)', desc: 'Circular/bar risk metric (e.g. 84.0 / 100)' },
            { name: 'trigger_badges', type: 'TriggerBadge[]', desc: 'POWER_LIFELINE_BREACH, LTO_VEHICLE_MATCH, TIER_INVERSION' }
          ],
          jsonPayload: {
            total_flagged: 32,
            results: [
              {
                household_id: "4PS-04A-2026-00129",
                head_of_household: {
                  full_name: "Eduardo Dela Cruz",
                  national_id: "PhilSys-9021-4412-8801"
                },
                address: {
                  barangay: "Barangay Canlubang",
                  municipality: "Calamba City"
                },
                enrolled_swdi_level: "Level 1: Survival",
                predicted_swdi_level: "Level 3: Self-Sufficient",
                composite_risk_score: 84.0,
                trigger_badges: [
                  "POWER_LIFELINE_BREACH",
                  "LTO_VEHICLE_MATCH",
                  "TIER_INVERSION"
                ]
              }
            ]
          }
        };

      case 'dispatch_modal':
        return {
          contractFile: '/docs/contracts/admin-web/admin-task-dispatch.json',
          endpoint: 'POST /api/v1/tasks/dispatch',
          description: 'Assigns field investigation tasks to local Municipal Links with statutory deadline and instructions.',
          variables: [
            { name: 'household_id', type: 'string', desc: 'Target household identifier' },
            { name: 'assigned_worker_id', type: 'string', desc: 'Selected Municipal Link staff ID' },
            { name: 'assignment_notes', type: 'string', desc: 'Special dispatch instruction for field worker' },
            { name: 'due_date', type: 'ISO date', desc: 'Default: +14 days from dispatch' },
            { name: 'priority', type: "'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'", desc: 'Task urgency radio selector' }
          ],
          jsonPayload: {
            household_id: "4PS-04A-2026-00129",
            assigned_worker_id: "ML-CALAMBA-019",
            assigned_worker_name: "Marvin Bautista, RSW",
            assignment_notes: "Verify if Yamaha NMAX is used for delivery or personal use; inspect LandBank cash card physical custody.",
            due_date: "2026-10-05",
            priority: "CRITICAL"
          }
        };

      case 'due_process':
        return {
          contractFile: '/docs/contracts/admin-web/admin-due-process.json',
          endpoint: 'GET /api/v1/appeals/dockets & POST /api/v1/appeals/file',
          description: '15-Day statutory notice countdown manager before benefit adjustments, with formal appeal filing docket modal.',
          variables: [
            { name: 'household_id', type: 'string', desc: 'Household under notice' },
            { name: 'status', type: "'NOTICE_OF_INELIGIBILITY' | 'UNDER_APPEAL_HEARING'", desc: 'Countdown state' },
            { name: 'countdown_timer', type: '15 days countdown', desc: 'Displays remaining days & hours' },
            { name: 'grant_continuation_active', type: 'boolean', desc: 'Amber badge: Grants Continuing During Notice Window' },
            { name: 'appeal_docket_id', type: 'string', desc: 'Unique formal docket number' },
            { name: 'hearing_date', type: 'ISO date', desc: 'Scheduled evidentiary hearing' },
            { name: 'appeal_grounds', type: 'string', desc: 'Legal grounds (e.g. illegal tapping by neighbor)' }
          ],
          jsonPayload: {
            household_id: "4PS-04A-2025-07993",
            notice_date: "2026-09-08",
            notice_expiry_date: "2026-09-23",
            status: "UNDER_APPEAL_HEARING",
            grant_continuation_active: true,
            appeal_docket: {
              appeal_docket_id: "APP-CAL-2026-0042",
              hearing_date: "2026-09-28",
              appeal_grounds: "Unauthorized power line tapping by neighbor; motorcycle registered to separated sibling."
            }
          }
        };

      case 'audit_ledger':
        return {
          contractFile: '/docs/contracts/admin-web/audit-chain-verification.json',
          endpoint: 'GET /api/v1/audit/verify-chain',
          description: 'Commission on Audit (COA) tamper-evident cryptographic blockchain ledger inspector with hash lineage and state deltas.',
          variables: [
            { name: 'sequence_index', type: 'number', desc: 'Sequential block height (e.g., 10450 -> 10451)' },
            { name: 'previous_entry_hash', type: 'hex string', desc: 'Truncated parent SHA-256 hash' },
            { name: 'entry_hash', type: 'hex string', desc: 'Current cryptographic block hash (3d9a1...01e)' },
            { name: 'actor.username', type: 'string', desc: 'Audited staff email and role' },
            { name: 'action', type: 'string', desc: 'e.g., BENEFICIARY_GRADUATED, TASK_DISPATCHED' },
            { name: 'state_delta', type: '{ before: {}, after: {} }', desc: 'JSON diff of modified database record' }
          ],
          jsonPayload: {
            ledger_status: "UNBROKEN_VALID",
            verified_blocks_count: 1000,
            blocks: [
              {
                sequence_index: 10450,
                previous_entry_hash: "0a8f9c1182...91ab4e",
                entry_hash: "3d9a1f28b49e01ea772093bf81da301e",
                actor: { "username": "dir.mendoza@dswd.gov.ph" },
                action: "BENEFICIARY_GRADUATED",
                state_delta: {
                  before: { "swdi_level": "Level 3: Self-Sufficient" },
                  after: { "status": "GRADUATED_KILOS_UNLAD" }
                }
              }
            ]
          }
        };

      case 'field_tasks':
        return {
          contractFile: '/docs/contracts/field-tablet/field-task-download.json',
          endpoint: 'GET /api/v1/field/tasks',
          description: 'IndexedDB cached tasks for social workers in remote mountain sitios with offline status header.',
          variables: [
            { name: 'task_id', type: 'string', desc: 'Unique field task ID' },
            { name: 'household_id', type: 'string', desc: 'Beneficiary household ID' },
            { name: 'priority', type: "'CRITICAL' | 'HIGH' | 'MEDIUM'", desc: 'Priority pill styling' },
            { name: 'head_of_household', type: 'object', desc: 'first_name, last_name, national_id' },
            { name: 'dispatch_instructions', type: 'string', desc: 'Yellow Audit Focus box with investigative guidance' },
            { name: 'cached_offline', type: 'boolean', desc: 'Indicates availability in offline tablet memory' }
          ],
          jsonPayload: {
            network_mode: "OFFLINE_CACHED",
            cached_count: 3,
            tasks: [
              {
                task_id: "TSK-LAG-2026-0091",
                household_id: "4PS-04A-2026-00129",
                priority: "HIGH",
                head_of_household: {
                  first_name: "Eduardo",
                  last_name: "Dela Cruz"
                },
                dispatch_instructions: "Check if Yamaha NMAX is used for MoveIt delivery; verify physical custody of LandBank card."
              }
            ]
          }
        };

      case 'field_verify':
        return {
          contractFile: '/docs/contracts/field-tablet/field-task-submission.json',
          endpoint: 'POST /api/v1/tasks/:id/submit',
          description: '5-Section digital checklist and evidence capture for field tablet with offline queueing.',
          variables: [
            { name: 'wall_construction', type: '1 | 2 | 3', desc: 'Light (1) / Mixed (2) / Concrete (3)' },
            { name: 'roof_construction', type: '1 | 2 | 3', desc: 'Makeshift (1) / Mixed (2) / Galvanized Iron (3)' },
            { name: 'water_access', type: '1 | 2 | 3', desc: 'Point Source (1) / Communal (2) / Individual Meter (3)' },
            { name: 'is_motorcycle_present', type: 'boolean', desc: 'Toggle: Yes / No' },
            { name: 'is_productive_asset', type: 'boolean', desc: 'Is vehicle used for daily livelihood?' },
            { name: 'proof_type', type: "'MOVEIT' | 'ANGKAS' | 'TRICYCLE_MTOP' | ...", desc: 'Livelihood proof dropdown' },
            { name: 'franchise_number', type: 'string', desc: 'Text input' },
            { name: 'physical_card_presented', type: 'boolean', desc: 'Did beneficiary produce LandBank 4Ps Cash Card?' },
            { name: 'card_matches_beneficiary', type: 'boolean', desc: 'Does card match national ID?' },
            { name: 'pawning_suspected', type: 'boolean', desc: 'Sangla-ATM counseling flag' },
            { name: 'evidence_attachments', type: 'array', desc: 'Photo, GPS Lat: 14.2145, Lon: 121.1651, SHA-256 hash' },
            { name: 'worker_recommendation', type: "'RETAIN' | 'RECOMMEND_GRADUATION' | 'INVESTIGATE_FRAUD'", desc: 'Final field action' },
            { name: 'narrative_report', type: 'string', desc: 'Field visit narrative textarea' }
          ],
          jsonPayload: {
            task_id: "TSK-LAG-2026-0091",
            household_id: "4PS-04A-2026-00129",
            wall_construction: 2,
            roof_construction: 3,
            water_access: 2,
            is_motorcycle_present: true,
            is_productive_asset: true,
            proof_type: "MOVEIT",
            franchise_number: "MV-2024-88190",
            physical_card_presented: true,
            card_matches_beneficiary: true,
            pawning_suspected: false,
            evidence_attachments: [
              {
                photo_url: "blob://evidence_photo_01.jpg",
                gps_readout: { latitude: 14.2145, longitude: 121.1651, accuracy_m: 4.2 },
                client_side_hash: "SHA-256: a4f5d810e922c019a8412b201"
              }
            ],
            worker_recommendation: "RETAIN",
            narrative_report: "Field visit confirmed family operates active MoveIt delivery service. Asset directly generates household sustenance."
          }
        };

      case 'field_sync':
        return {
          contractFile: '/docs/contracts/field-tablet/field-sync-queue.json',
          endpoint: 'POST /api/v1/sync/batch',
          description: 'IndexedDB offline queue inspector with retry mechanism and connectivity-gated sync trigger.',
          variables: [
            { name: 'pending_reports', type: 'array', desc: 'Cached evaluations stored in IndexedDB' },
            { name: 'sync_status', type: "'PENDING' | 'SYNCED'", desc: 'Status clock or checkmark icon' },
            { name: 'force_sync_now', type: 'action', desc: 'Manual override active when Wi-Fi is detected' }
          ],
          jsonPayload: {
            queue_length: 1,
            reports: [
              {
                task_id: "TSK-LAG-2026-0091",
                household_id: "4PS-04A-2026-00129",
                captured_at: "2026-09-21 09:40 PHT",
                status: "PENDING_SYNC",
                payload_bytes: 48210
              }
            ]
          }
        };

      case 'dispatch_manager':
        return {
          contractFile: '/docs/contracts/desktop/admin-task-dispatch.json',
          endpoint: 'GET /api/v1/tasks/operations',
          description: 'Regional caseworker field assignment management and workload balance inspector.',
          variables: [
            { name: 'assigned_tasks', type: 'array', desc: 'Active verification tasks by caseworker' },
            { name: 'due_dates', type: 'date', desc: 'Field visit deadlines' }
          ],
          jsonPayload: {
            active_field_caseworkers: 8,
            total_active_dispatches: 24,
            overdue_surveys: 1
          }
        };

      case 'admin_settings':
        return {
          contractFile: '/docs/contracts/desktop/admin-policy-settings.json',
          endpoint: 'GET /api/v1/admin/settings',
          description: 'Cross-registry matching thresholds, lifeline kWh cutoff, and statutory notice timelines.',
          variables: [
            { name: 'meralco_lifeline_kwh', type: 'number', desc: 'Maximum allowable kWh before flag (200 kWh)' },
            { name: 'risk_cutoff', type: 'number', desc: 'Composite triage score threshold (70/100)' }
          ],
          jsonPayload: {
            meralco_lifeline_kwh: 200,
            risk_cutoff: 70,
            statutory_appeal_days: 15
          }
        };

      case 'field_dashboard':
        return {
          contractFile: '/docs/contracts/field-tablet/field-task-download.json',
          endpoint: 'GET /api/v1/field/caseworker-hub',
          description: 'Municipal Link cluster dashboard, priority household list, and cached tasks.',
          variables: [
            { name: 'assigned_cases', type: 'number', desc: 'Active assigned households in municipality' },
            { name: 'offline_cached_records', type: 'number', desc: 'Number of records stored in browser IndexedDB' }
          ],
          jsonPayload: {
            municipality: "Calamba City",
            assigned_cases: 12,
            urgent_visits_remaining: 3,
            offline_cached_records: 12
          }
        };

      case 'coa_dashboard':
        return {
          contractFile: '/docs/contracts/audit/coa-audit-overview.json',
          endpoint: 'GET /api/v1/audit/dashboard',
          description: 'State Auditor Oversight and statutory audit trail compliance monitor.',
          variables: [
            { name: 'compliance_rate', type: 'percentage', desc: 'Overall evidentiary compliance' },
            { name: 'audited_hashes_verified', type: 'number', desc: 'Cryptographically valid blockchain records' }
          ],
          jsonPayload: {
            compliance_rate: 94.2,
            total_records_audited: 3412,
            discrepancy_rate: 4.8
          }
        };

      case 'coa_sampling':
        return {
          contractFile: '/docs/contracts/audit/coa-sampling-ledger.json',
          endpoint: 'GET /api/v1/audit/sampling',
          description: 'Evidentiary sample reconciliation against LTO, Meralco, and LandBank registries.',
          variables: [
            { name: 'sampled_households', type: 'array', desc: 'Stratified sample records' },
            { name: 'cross_match_evidence', type: 'object', desc: 'External agency verification data' }
          ],
          jsonPayload: {
            sample_size: 450,
            sampling_confidence: "95% (e = 0.05)",
            reconciled_with_lto: 142
          }
        };

      default:
        return {
          contractFile: '/docs/contracts/general.json',
          endpoint: 'GET /api/v1/system/status',
          description: 'System specifications and status.',
          variables: [],
          jsonPayload: { status: "OK", timestamp: "2026-09-21T12:00:00Z" }
        };
    }
  };

  const details = getContractDetails(activeScreen);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(details.jsonPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-300">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <FileJson className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded font-bold">
                  {SCREEN_CONFIGS[activeScreen].number}
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  {SCREEN_CONFIGS[activeScreen].title}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Contract: {details.contractFile}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-800 text-xs">
          
          {/* Endpoint Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Link2 className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-blue-900">API Endpoint & Target:</span>
            </div>
            <code className="text-xs font-mono font-bold bg-white text-blue-800 px-2 py-1 rounded border border-blue-200 block">
              {details.endpoint}
            </code>
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
              {details.description}
            </p>
          </div>

          {/* Exact Variable Bindings Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-800" />
                <span>Contract Variable Bindings:</span>
              </h4>
              <span className="text-[10px] text-slate-500">Exact UI Field Bindings</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Variable / Path</th>
                    <th className="p-2">Type / Constraint</th>
                    <th className="p-2">Description / UI Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {details.variables.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-blue-900">{v.name}</td>
                      <td className="p-2 text-slate-600">{v.type}</td>
                      <td className="p-2 font-sans text-slate-700 text-[11px]">{v.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* JSON Contract Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Payload & Contract Schema Sample:</span>
              </h4>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-900 font-medium px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-700">
              {JSON.stringify(details.jsonPayload, null, 2)}
            </pre>
          </div>

          {/* Developer Implementation Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900">
            <span className="font-bold block mb-1">Frontend Developer Implementation Note:</span>
            <p className="leading-relaxed">
              When implementing this screen in production, ensure state machines handle offline storage (IndexedDB), validate required tokens on the top-bar, and respect Philippine Data Privacy Act (RA 10173) safeguards on beneficiary PhilSys numbers.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
