import { SampleDataLabel } from '../common/SampleDataLabel';
import { AccessibleDialog } from '../common/AccessibleDialog';
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Scale, 
  Link2, 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingDown,
  Building2,
  Download,
  Search,
  X
} from 'lucide-react';

interface CoaAuditDashboardProps {
  auditorName: string;
  onNavigateToLedger: () => void;
  onNavigateToSampling: () => void;
  showSpecAnnotations?: boolean;
}

export const CoaAuditDashboard: React.FC<CoaAuditDashboardProps> = ({
  auditorName,
  onNavigateToLedger,
  onNavigateToSampling,
  showSpecAnnotations = false,
}) => {
  const [aomModalOpen, setAomModalOpen] = useState(false);
  const [aomPreviewed, setAomPreviewed] = useState(false);

  const lguComplianceData = [
    { name: 'Santa Rosa City', compliance: 98.2, questionedFunds: '₱24,000', sampled: 8, status: 'Compliant' },
    { name: 'Los Baños', compliance: 96.5, questionedFunds: '₱36,000', sampled: 6, status: 'Compliant' },
    { name: 'Biñan City', compliance: 95.0, questionedFunds: '₱84,000', sampled: 7, status: 'Compliant' },
    { name: 'Calamba City', compliance: 92.4, questionedFunds: '₱216,000', sampled: 12, status: 'Review Needed' },
    { name: 'San Pedro City', compliance: 91.8, questionedFunds: '₱122,000', sampled: 9, status: 'Review Needed' },
  ];

  const handlePreviewAOM = (e: React.FormEvent) => {
    e.preventDefault();
    setAomPreviewed(true);
  };

  return (
    <div className="module-page audit-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">PERSONA 3: COA Audit Overview</span>
            <span className="ml-2">Constitutional Mandate: RA 11310 & COA Circular 2024-008</span>
          </div>
          <div>coa-audit-overview.json</div>
        </div>
      )}

      {/* Official COA Header & Jurisdiction */}
      <div className="module-heading">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#0c2340] border border-amber-400/80 text-amber-300 font-bold text-xs flex flex-col items-center justify-center shadow-2xs leading-none">
            <span className="text-[11px] font-black">COA</span>
            <span className="text-[7px] text-amber-200/80 mt-0.5">STATE</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <SampleDataLabel />
          <h2 className="text-xl font-bold text-stone-900 tracking-tight font-display">
                Audit Overview
              </h2>
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Special Audit Unit
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Auditor: <span className="font-semibold text-stone-800">{auditorName}</span>
            </p>
          </div>
        </div>

        {/* Global Action: Generate AOM */}
        <div className="flex items-center space-x-3 self-start md:self-auto shrink-0">
          <button
            onClick={() => { setAomPreviewed(false); setAomModalOpen(true); }}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Preview Audit Observation</span>
          </button>
        </div>
      </div>

      {/* 4 Auditor-General KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Statutory Compliance Index */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Statutory Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-stone-900">94.2%</span>
            <span className="text-[11px] font-medium text-emerald-800">Satisfactory</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            RA 11310 & COA Circular 2024-008
          </div>
        </div>

        {/* KPI 2: Questioned Disbursements */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Questioned Disbursements</span>
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-900">₱482,000</span>
            <span className="text-[11px] font-medium text-stone-500">32 Flags</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            Protected against improper drawdown
          </div>
        </div>

        {/* KPI 3: Evidentiary Audit Sampling */}
        <button type="button"
          onClick={onNavigateToSampling}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Sampling Coverage</span>
            <FileCheck2 className="w-4 h-4 text-[#132e4f]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-stone-900">68.4%</span>
            <span className="text-[11px] font-medium text-stone-600">42 / 62 Cases</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Independent verification</span>
            <span className="text-stone-700 font-semibold underline">Inspect &rarr;</span>
          </div>
        </button>

        {/* KPI 4: Cryptographic Ledger Integrity */}
        <button type="button"
          onClick={onNavigateToLedger}
          className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#132e4f] transition cursor-pointer text-left"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Audit Hash Chain</span>
            <Link2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-[#132e4f]">Verify range</span>
            <span className="text-[11px] font-medium text-stone-600">Read-only API</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Up to 1,000 blocks per request</span>
            <span className="text-stone-700 font-semibold underline">Verify &rarr;</span>
          </div>
        </button>

      </div>

      {/* Main Grid: Cryptographic Chain Inspector Gateway + Regional LGU Compliance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Cryptographic Audit Status & Cross-Matching Risk Spectrum */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Cryptographic Ledger Access Gateway */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900 font-display">
                  Cryptographic Audit Chain Status
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/80">
                Verification on request
              </span>
            </div>

            <div className="pt-4 space-y-3.5">
              <p className="text-xs text-stone-600 leading-relaxed">
                Verify an existing sequence range against the backend audit ledger. Integrity results are shown only after a successful verification request.
              </p>


              <div className="pt-2 flex items-center justify-end">
                <button
                  id="coa-launch-chain-inspector-btn"
                  onClick={onNavigateToLedger}
                  className="px-4 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold text-xs rounded-lg shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Open audit verification</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Cross-Matching Audit Risk Distribution */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 font-display">
                Audited Discrepancy Breakdown by Statutory Rule
              </h3>
              <span className="text-xs text-stone-500 font-mono">32 Flagged Accounts</span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-800">Rule 1: Lifeline Electricity Breach (&gt; 200 kWh/mo)</span>
                  <span className="font-mono text-stone-600 font-semibold">16 Cases (50.0%) · ₱240,000 questioned</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#132e4f] h-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-800">Rule 2: LTO Motor Vehicle Registry Match</span>
                  <span className="font-mono text-stone-600 font-semibold">11 Cases (34.4%) · ₱165,000 questioned</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-600 h-full" style={{ width: '34.4%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-800">Rule 3: Sangla-ATM Pawn Discrepancy</span>
                  <span className="font-mono text-stone-600 font-semibold">5 Cases (15.6%) · ₱77,000 questioned</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-600 h-full" style={{ width: '15.6%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Laguna Cluster Municipal Compliance Matrix */}
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 font-display">
              LGU Compliance Audit Scores
            </h3>
            <p className="text-xs text-stone-500">
              Audit conformity by pilot municipality under Laguna Regional Cluster.
            </p>

            <div className="space-y-2.5 pt-2">
              {lguComplianceData.map((lgu) => (
                <div key={lgu.name} className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                    <span>{lgu.name}</span>
                    <span className="font-mono">{lgu.compliance}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>{lgu.questionedFunds} Questioned</span>
                    <span className={`px-1.5 py-0.2 rounded font-medium text-[10px] ${
                      lgu.status === 'Compliant'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {lgu.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={onNavigateToSampling}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition text-center block cursor-pointer"
              >
                Conduct Evidentiary Sampling Audit &rarr;
              </button>
            </div>
          </div>

          {/* Audit Protocol Reference */}
          <div className="bg-stone-50 p-5 rounded-xl border border-stone-200/90 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#132e4f]" />
              <h4 className="text-xs font-bold text-stone-900 font-display">
                Auditor Independent Jurisdiction
              </h4>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              In compliance with constitutional separation of powers, COA audit accounts do not hold operational dispatch or record modification privileges. All findings are served via formal Audit Observation Memorandums (AOM) to the DSWD Regional Director.
            </p>
          </div>

        </div>

      </div>

      {/* Modal: Draft Audit Observation Memorandum (AOM) */}
      {aomModalOpen && (
        <AccessibleDialog titleId="aom-dialog-title" onClose={() => setAomModalOpen(false)} className="workspace-dialog fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="dialog-sheet bg-white rounded-xl shadow-xl border border-stone-200/90 w-full max-w-lg">
            
            <div className="bg-stone-50/70 border-b border-stone-200/90 p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-700 text-white rounded-lg shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="aom-dialog-title" className="text-base font-bold text-stone-900 font-display">
                    Audit Observation Preview
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Sample AOM; no official issuance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAomModalOpen(false)}
                aria-label="Close audit observation dialog"
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handlePreviewAOM} onChange={() => setAomPreviewed(false)} className="dialog-form text-sm text-stone-800">
              <div className="dialog-body space-y-4">
              <p className="preview-note">Preview only. This document is not saved, sent, or certified.</p>
              
              <div>
                <label htmlFor="aom-reference" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  AOM Reference Number
                </label>
                <input
                  id="aom-reference"
                  type="text"
                  readOnly
                  value="COA-AOM-2026-LAG-003"
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-xs bg-stone-100 text-stone-600"
                />
              </div>

              <div>
                <label htmlFor="aom-scope" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Audit Scope & Subject Matter
                </label>
                <select id="aom-scope" className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white">
                  <option>32 Beneficiaries with Unreconciled Lifeline Electricity Discrepancies (&gt;200 kWh)</option>
                  <option>11 Beneficiaries with LTO Motor Vehicle Ownership without Productive Livelihood Proof</option>
                  <option>5 Beneficiaries with Flagged Sangla-ATM Card Possession Anomalies</option>
                </select>
              </div>

              <div>
                <label htmlFor="aom-observations" className="block font-semibold text-stone-700 mb-1.5 text-xs">
                  Observations & Recommendations <span className="required-label">(required)</span>
                </label>
                <textarea
                  id="aom-observations"
                  rows={4}
                  required
                  defaultValue="Management is advised to expedite on-site SWDI verification of the flagged 32 beneficiaries in Calamba and San Pedro to avoid potential Notice of Disallowance under Section 12 of RA 11310."
                  className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#132e4f] outline-none leading-relaxed"
                />
              </div>

              </div>
              <footer className="dialog-footer">
                {aomPreviewed && <p role="status" className="dialog-feedback">Preview checked. Nothing was saved, sent, or certified.</p>}
                <button
                  type="button"
                  onClick={() => setAomModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium text-xs hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-submit-aom-btn"
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Check Preview</span>
                </button>
              </footer>

            </form>

          </div>
        </AccessibleDialog>
      )}

    </div>
  );
};
