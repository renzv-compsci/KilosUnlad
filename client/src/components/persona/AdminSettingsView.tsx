import React, { useEffect, useState } from 'react';
import { Sliders, Lock, CloudRain, MapPin } from 'lucide-react';
import { apiErrorMessage, fetchPolicy, PolicySnapshot } from '../../services/api';
import { displayDate } from '../../utils/displayDate';

interface AdminSettingsViewProps {
  showSpecAnnotations?: boolean;
}

const WEIGHT_LABELS: Record<string, string> = {
  swdi_per_level: 'Per SWDI level the model predicts above enrolment', power: 'Power above lifeline',
  water: 'Water above lifeline', telecom: 'Telecom postpaid spend', vehicle: 'Registered vehicle (LTO)',
};

const Row: React.FC<{ label: string; help?: string; value: React.ReactNode }> = ({ label, help, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 py-2 border-b border-stone-100 last:border-0">
    <div className="min-w-0">
      <div className="text-xs font-bold text-stone-900">{label}</div>
      {help && <p className="text-[11px] text-stone-500">{help}</p>}
    </div>
    <span className="font-mono font-bold text-sm text-[#13233f] shrink-0">{value}</span>
  </div>
);

// Read-only view of the rules the server enforces (GET /system/policy).
export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ showSpecAnnotations = false }) => {
  const [policy, setPolicy] = useState<PolicySnapshot | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchPolicy(controller.signal).then(setPolicy).catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  return (
    <div className="module-page settings-page">
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600">admin-policy.json</div>
      )}
      <div className="module-heading">
        <div>
          <span className="text-[10px] font-semibold bg-[#13233f] text-white px-2 py-0.5 rounded font-mono">ADMINISTRATIVE GOVERNANCE</span>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1 font-display">Policy Settings</h2>
          <p className="text-xs text-stone-500 mt-0.5">The thresholds and timers the server enforces now. They are fixed in the server configuration and cannot be edited here.</p>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-rose-800">{error}</p>}
      {!policy && !error && <p role="status" className="text-xs text-stone-500">Loading policy…</p>}
      {policy && <div className="space-y-5">
        <section className="bg-white p-4 sm:p-6 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
            <Sliders className="w-4 h-4 text-[#13233f]" />
            <h3 className="text-sm font-bold text-stone-900 font-display">Composite risk score</h3>
          </div>
          <Row label="Flag threshold" help="Households at or above this score are flagged for field verification." value={`≥ ${policy.risk_score.flag_threshold}`} />
          {Object.entries(policy.risk_score.weights).map(([key, weight]) => (
            <Row key={key} label={WEIGHT_LABELS[key] ?? key} value={`+${weight}`} />
          ))}
          <Row label="Score cap" value={policy.risk_score.cap} />
          <Row label="Power lifeline (RA 11552)" value={`${policy.lifeline_limits.power_kwh_per_month} kWh/mo`} />
          <Row label="Water lifeline" value={`${policy.lifeline_limits.water_cu_m_per_month} m³/mo`} />
        </section>
        <section className="bg-white p-4 sm:p-6 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
            <Lock className="w-4 h-4 text-[#13233f]" />
            <h3 className="text-sm font-bold text-stone-900 font-display">Due process and field verification</h3>
          </div>
          <Row label="Appeal window (RA 11310 Sec. 12)" help="Calendar days from the notice to file an appeal." value={`${policy.due_process.appeal_window_days} days`} />
          <Row label="Child age-out" help={`Counted on the ${policy.age_out.timezone} calendar date.`} value={`until age ${policy.age_out.eligible_until_age}`} />
          <Row label="Geofence radius" help="Evidence photos must be taken within this distance of the household." value={<><MapPin className="inline w-3.5 h-3.5" /> {policy.field_verification.geofence_radius_m} m</>} />
          <Row label="Sangla-ATM: max swipe interval" value={`${policy.sangla_atm.max_swipe_interval_seconds} s`} />
          <Row label="Sangla-ATM: nocturnal window" value={`${policy.sangla_atm.nocturnal_start_hour}:00–${policy.sangla_atm.nocturnal_end_hour}:30`} />
          <Row label="Sangla-ATM: cluster repeat ratio" value={policy.sangla_atm.cluster_repeat_ratio} />
        </section>
        <section className="bg-white p-4 sm:p-6 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
            <CloudRain className="w-4 h-4 text-[#13233f]" />
            <h3 className="text-sm font-bold text-stone-900 font-display">Calamity moratorium declarations (RA 10121)</h3>
          </div>
          {policy.calamity_zones.length === 0 && <p className="text-xs text-stone-500 pt-2">No declarations on record.</p>}
          {policy.calamity_zones.map(zone => (
            <Row key={`${zone.municipality}-${zone.declared_at}`} label={`${zone.municipality}, ${zone.province}`}
              help={`${zone.ndrrmc_reference ?? 'No reference'} · declared ${displayDate(zone.declared_at)}${zone.expires_at ? ` · expires ${displayDate(zone.expires_at)}` : ''}`}
              value={zone.is_active ? 'Active' : 'Lifted'} />
          ))}
        </section>
      </div>}
    </div>
  );
};
