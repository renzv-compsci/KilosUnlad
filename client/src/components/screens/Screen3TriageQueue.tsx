import React, { useState } from 'react';
import { BeneficiaryTriageItem } from '../../types/contracts';
import { MOCK_TRIAGE_ITEMS } from '../../data/mockContracts';
import { 
  Search, 
  Filter, 
  Send, 
  AlertTriangle, 
  Zap, 
  Bike, 
  TrendingUp, 
  Building, 
  CreditCard,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface Screen3TriageQueueProps {
  onDispatchTask: (item: BeneficiaryTriageItem) => void;
  showSpecAnnotations?: boolean;
  items?: BeneficiaryTriageItem[];
}

export const Screen3TriageQueue: React.FC<Screen3TriageQueueProps> = ({
  onDispatchTask,
  showSpecAnnotations = false,
  items = MOCK_TRIAGE_ITEMS,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.household_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.head_of_household.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.head_of_household.national_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMunicipality = 
      municipalityFilter === 'ALL' || item.address.municipality.includes(municipalityFilter);

    const matchesSeverity = 
      severityFilter === 'ALL' || item.severity === severityFilter;

    return matchesSearch && matchesMunicipality && matchesSeverity;
  });

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'POWER_LIFELINE_BREACH':
        return <Zap className="w-3 h-3 mr-1 text-red-600" />;
      case 'LTO_VEHICLE_MATCH':
        return <Bike className="w-3 h-3 mr-1 text-amber-600" />;
      case 'TIER_INVERSION':
        return <TrendingUp className="w-3 h-3 mr-1 text-red-600" />;
      case 'REAL_ESTATE_CROSSMATCH':
        return <Building className="w-3 h-3 mr-1 text-amber-600" />;
      case 'SANGLA_ATM_REPORT':
        return <CreditCard className="w-3 h-3 mr-1 text-amber-600" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-700 bg-red-50 border-red-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-300 rounded-lg p-2.5 text-[10px] font-mono text-stone-800 flex justify-between items-center shadow-2xs">
          <div>
            <span className="font-bold text-[#132e4f]">SCREEN 3 SPEC: Triage Queue & Flagged Household Table (/triage)</span>
            <span className="ml-2">Endpoint: GET /api/v1/beneficiaries/triage-queue</span>
          </div>
          <div>Contract: /docs/contracts/admin-web/admin-triage-feed.json</div>
        </div>
      )}

      {/* Screen Title & Clean Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5 font-display">
              <span>Triage Queue</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                {filteredItems.length} Flagged Cases
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Cross-match discrepancies: Meralco Lifeline Consumption (&gt; 200 kWh), LTO Vehicle Records, and SWDI Tier Shifts.
            </p>
          </div>

          <div className="text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 self-start md:self-auto font-mono text-[11px]">
            Statutory Notice Rule: Mandatory under RA 11310 Sec. 12
          </div>
        </div>

        {/* Filters Row (Search, Municipality, Severity) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          
          {/* Search by household_id or head_of_household.full_name */}
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              id="triage-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Household ID, Beneficiary Name, or National ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#132e4f] focus:border-[#132e4f] outline-none transition bg-white text-stone-900 placeholder:text-stone-400"
            />
            {showSpecAnnotations && (
              <span className="text-[9px] font-mono text-stone-400 mt-0.5 block">
                Binding: filter.household_id || filter.head_of_household.full_name
              </span>
            )}
          </div>

          {/* Municipality Dropdown */}
          <div className="sm:col-span-3">
            <select
              id="triage-municipality-select"
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#132e4f] outline-none bg-white font-medium text-stone-700 transition cursor-pointer"
            >
              <option value="ALL">All Municipalities (Laguna)</option>
              <option value="Calamba">Calamba City (Calamity Freeze)</option>
              <option value="Santa Rosa">Santa Rosa</option>
              <option value="San Pedro">San Pedro</option>
              <option value="Los Baños">Los Baños</option>
              <option value="Biñan">Biñan City</option>
            </select>
          </div>

          {/* Severity Dropdown */}
          <div className="sm:col-span-3">
            <select
              id="triage-severity-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#132e4f] outline-none bg-white font-medium text-stone-700 transition cursor-pointer"
            >
              <option value="ALL">All Severity Levels</option>
              <option value="CRITICAL">Critical (Score ≥ 80)</option>
              <option value="HIGH">High (Score ≥ 70)</option>
              <option value="MEDIUM">Medium (Score ≥ 50)</option>
              <option value="LOW">Low (Compliant)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Clean High-Contrast Data Table */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Table Header */}
            <thead className="bg-stone-50/90 text-stone-600 uppercase font-semibold text-[11px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Household ID</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 1]</span>}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Beneficiary Name</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 2]</span>}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Jurisdiction</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 3]</span>}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>SWDI Shift</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 4]</span>}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Risk Score</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 5]</span>}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Trigger Badges</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 6]</span>}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Action</span>
                    {showSpecAnnotations && <span className="text-[9px] font-mono text-[#132e4f] lowercase">[col 7]</span>}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-stone-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    No flagged households match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  return (
                    <tr 
                      key={item.household_id} 
                      className="hover:bg-stone-50/80 transition"
                    >
                      {/* Column 1: household_id */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-stone-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            item.severity === 'CRITICAL' ? 'bg-rose-600' :
                            item.severity === 'HIGH' ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}></span>
                          <span>{item.household_id}</span>
                        </div>
                        {showSpecAnnotations && (
                          <div className="text-[9px] font-mono text-stone-400">
                            household_id
                          </div>
                        )}
                      </td>

                      {/* Column 2: head_of_household.full_name + national_id */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-stone-900">
                          {item.head_of_household.full_name}
                        </div>
                        <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                          {item.head_of_household.national_id}
                        </div>
                      </td>

                      {/* Column 3: address.barangay + address.municipality */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-stone-800">
                          {item.address.barangay}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {item.address.municipality}, {item.address.province}
                        </div>
                      </td>

                      {/* Column 4: Tier Inversion (Clean text, no heavy boxing) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-xs">
                          <span className="text-stone-600 font-medium">
                            {item.enrolled_swdi_level}
                          </span>
                          <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="text-rose-700 font-semibold">
                            {item.predicted_swdi_level}
                          </span>
                        </div>
                        {showSpecAnnotations && (
                          <span className="text-[9px] font-mono text-stone-400 block mt-0.5">
                            enrolled_swdi_level → predicted_swdi_level
                          </span>
                        )}
                      </td>

                      {/* Column 5: Risk Score (Unboxed, clean typography with sleek micro gauge) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <span className={`text-sm font-bold font-mono tabular-nums tracking-tight ${
                            item.composite_risk_score >= 70 ? 'text-rose-700' :
                            item.composite_risk_score >= 50 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {item.composite_risk_score.toFixed(1)}
                          </span>
                          {/* Sleek inline bar gauge (no container box or border) */}
                          <div className="w-14 bg-stone-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                item.composite_risk_score >= 70 ? 'bg-rose-600' :
                                item.composite_risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.composite_risk_score}%` }}
                            ></div>
                          </div>
                        </div>
                        {showSpecAnnotations && (
                          <span className="text-[9px] font-mono text-stone-400 block mt-0.5">
                            composite_risk_score
                          </span>
                        )}
                      </td>

                      {/* Column 6: Trigger Badges (Unboxed semantic items with icon & clean text) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col space-y-1 max-w-xs">
                          {item.trigger_badges.map((badge, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-1.5 text-xs text-stone-700"
                              title={badge.detail}
                            >
                              <span className="shrink-0">{getBadgeIcon(badge.type)}</span>
                              <span className="font-medium text-stone-800 truncate">{badge.label}</span>
                            </div>
                          ))}
                        </div>
                        {showSpecAnnotations && (
                          <span className="text-[9px] font-mono text-stone-400 block mt-0.5">
                            trigger_badges[]
                          </span>
                        )}
                      </td>

                      {/* Column 7: Actions (Dispatch Task) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          id={`dispatch-task-btn-${item.household_id}`}
                          onClick={() => onDispatchTask(item)}
                          className="px-3 py-1.5 bg-[#132e4f] hover:bg-[#0c2340] text-white rounded-lg font-medium text-xs shadow-2xs transition inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Task</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3.5 bg-stone-50/80 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
          <div>
            Showing <span className="font-semibold text-stone-900">{filteredItems.length}</span> of{' '}
            <span className="font-semibold text-stone-900">{items.length}</span> audited cases
          </div>
          <div className="text-[11px] text-stone-400 font-mono">
            Laguna Pilot Jurisdiction Cluster
          </div>
        </div>

      </div>

    </div>
  );
};
