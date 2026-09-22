import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  Save, 
  Check, 
  Lock, 
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface AdminSettingsViewProps {
  showSpecAnnotations?: boolean;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  showSpecAnnotations = false,
}) => {
  const [lifelineThreshold, setLifelineThreshold] = useState(200);
  const [compositeRiskCutoff, setCompositeRiskCutoff] = useState(70);
  const [appealGracePeriod, setAppealGracePeriod] = useState(15);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-5xl mx-auto">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">PERSONA 1: Administrative Policy Thresholds & Algorithm Parameters</span>
            <span className="ml-2">Regional Director Administrative Configuration</span>
          </div>
          <div>admin-policy-settings.json</div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold bg-[#132e4f] text-white px-2 py-0.5 rounded font-mono">
              ADMINISTRATIVE GOVERNANCE
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1 font-display">
            Statutory Rule Parameters & System Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure automated cross-matching engine sensitivity and statutory due process timers.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>Policy Parameters Updated</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Section 1: Algorithmic Trigger Thresholds */}
        <div className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
            <Sliders className="w-4 h-4 text-[#132e4f]" />
            <h3 className="text-sm font-bold text-stone-900 font-display">
              Cross-Matching Discrepancy Triggers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-xs font-bold text-stone-900 mb-1">
                Lifeline Electricity Consumption Threshold (kWh/mo)
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Monthly kilowatt-hour usage above which utility accounts trigger discrepancy review under Rule 1.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="100"
                  max="350"
                  step="10"
                  value={lifelineThreshold}
                  onChange={(e) => setLifelineThreshold(Number(e.target.value))}
                  className="flex-1 accent-[#132e4f]"
                />
                <span className="font-mono font-bold text-sm text-[#132e4f] w-16 text-right">
                  {lifelineThreshold} kWh
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-900 mb-1">
                High-Risk Triage Cutoff Score (Si)
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Composite risk score that automatically flags households for mandatory field caseworker dispatch.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="5"
                  value={compositeRiskCutoff}
                  onChange={(e) => setCompositeRiskCutoff(Number(e.target.value))}
                  className="flex-1 accent-[#132e4f]"
                />
                <span className="font-mono font-bold text-sm text-[#132e4f] w-16 text-right">
                  Si ≥ {compositeRiskCutoff}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Statutory Timers under RA 11310 */}
        <div className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
            <Lock className="w-4 h-4 text-[#132e4f]" />
            <h3 className="text-sm font-bold text-stone-900 font-display">
              Statutory Due Process Compliance Windows
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-900 mb-1">
                Notice of Ineligibility Appeal Grace Period (Days)
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Mandated under Section 12, RA 11310. Standard statutory window is 15 calendar days from formal service.
              </p>
              <div className="flex items-center space-x-3 max-w-xs">
                <input
                  type="number"
                  readOnly
                  value={appealGracePeriod}
                  className="w-24 p-2 border border-stone-300 rounded-lg font-mono text-xs bg-stone-100 text-stone-700"
                />
                <span className="text-xs text-stone-500 font-medium">Calendar Days (Locked by Statute)</span>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 text-xs text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800">Legal Safeguard: </span>
              In accordance with Commission on Audit regulations and DSWD Administrative Order No. 16, no beneficiary stipend may be halted without exhausting this 15-day due process period or receipt of formal field SWDI re-evaluation.
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Administrative Parameters</span>
          </button>
        </div>

      </form>

    </div>
  );
};
