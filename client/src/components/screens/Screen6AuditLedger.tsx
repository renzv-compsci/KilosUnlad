import { SampleDataLabel } from '../common/SampleDataLabel';
import React, { useState } from 'react';
import { AuditBlock } from '../../types/contracts';
import { MOCK_AUDIT_BLOCKS } from '../../data/mockContracts';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Link2, 
  User, 
  Activity, 
  FileCode, 
  ArrowRight, 
  Check, 
  Copy, 
  RefreshCw,
  Lock,
  FileCheck2
} from 'lucide-react';

interface Screen6AuditLedgerProps {
  showSpecAnnotations?: boolean;
}

export const Screen6AuditLedger: React.FC<Screen6AuditLedgerProps> = ({
  showSpecAnnotations = false,
}) => {
  const [isTampered, setIsTampered] = useState(false);
  const [blocks] = useState<AuditBlock[]>(MOCK_AUDIT_BLOCKS);
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(10450);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="module-page ledger-page">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">SCREEN 6: COA Cryptographic Chain Inspector</span>
            <span className="ml-2">GET /api/v1/audit/verify-chain</span>
          </div>
          <div>audit-chain-verification.json</div>
        </div>
      )}

      {/* Screen Title */}
      <div className="module-heading">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200/80 font-mono">
              COA INDEPENDENT OVERSIGHT
            </span>
          </div>
          <SampleDataLabel />
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1.5 font-display">
            Audit Ledger
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Sealed SHA-256 Merkle audit trail recording state transitions, SWDI evaluations, task dispatches, and notice issuance.
          </p>
        </div>

        {/* Developer / Auditor Mode Toggle to simulate tampering */}
        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <button
            id="toggle-ledger-tamper-simulation-btn"
            onClick={() => setIsTampered(!isTampered)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 cursor-pointer ${
              isTampered
                ? 'bg-rose-700 text-white border-rose-800 shadow-2xs'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-2xs'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isTampered ? 'Reset Chain to Genesis State' : 'Simulate Block Tampering'}</span>
          </button>
        </div>
      </div>

      {/* 1. Status Shield Integrity Banner */}
      <div 
        id="coa-integrity-banner"
        className={`p-5 rounded-xl border shadow-2xs transition-all ${
          isTampered
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
          
          {/* Status Shield Icon */}
          <div className={`p-2.5 rounded-lg shrink-0 ${
            isTampered ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {isTampered ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isTampered ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isTampered ? 'Integrity Anomaly' : 'Ledger Verified'}
              </span>
              <span className="font-mono text-[11px] text-stone-500">
                SHA-256 Merkle-DAG Architecture
              </span>
            </div>

            <h3 className={`text-base font-bold mt-1 tracking-tight font-display ${
              isTampered ? 'text-rose-900' : 'text-emerald-900'
            }`}>
              {isTampered
                ? 'Tamper Detected at Block #10451 — Hash Mismatch'
                : 'Cryptographic Chain Valid — 1,000 / 1,000 Blocks Verified'}
            </h3>

            <p className={`text-xs mt-0.5 max-w-3xl leading-relaxed ${
              isTampered ? 'text-rose-800' : 'text-stone-600'
            }`}>
              {isTampered
                ? 'Block #10451 contains an invalid digital signature. The internal Merkle root does not reconcile with previous block header 3d9a1f28b49e01ea. Actions flagged under COA Circular 2024-008.'
                : 'All sequential blocks verified via cryptographic proofs. Linear state transitions match historical DSWD regional audit logs with complete fidelity.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="bg-white px-2.5 py-1 rounded-md border border-stone-200/90 text-stone-700">
                Root Hash: <span className="font-semibold text-stone-900">0x992fa...12e8</span>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-md border border-stone-200/90 text-stone-700">
                Auditor Key: <span className="font-semibold text-stone-900">COA-REG4A-PUB-7718</span>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-md border border-stone-200/90 text-stone-700">
                Last Verified: <span className="font-semibold text-stone-900">2026-09-21 10:35 PHT</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Sequential Block Visualizer (Blockchain Timeline) */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Link2 className="w-4 h-4 text-[#13233f]" />
              <span>Sequential Block Lineage</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Sequence progression 10450 → 10451 → 10452 with cryptographic hash chain linking
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-mono text-stone-600 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
              {blocks.length} Blocks Rendered
            </span>
          </div>
        </div>

        {/* Blockchain Visual Line */}
        <div className="relative border-l-2 border-stone-200 ml-3 sm:ml-4 pl-5 sm:pl-6 space-y-6">
          
          {blocks.map((block) => {
            const isExpanded = expandedBlockIndex === block.sequence_index;

            return (
              <div 
                key={block.sequence_index}
                id={`audit-block-${block.sequence_index}`}
                className="relative group"
              >
                {/* Node Connector Circle */}
                <div className="absolute -left-[27px] sm:-left-[31px] top-4 w-4 h-4 rounded-full bg-white border-2 border-[#13233f] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#13233f]"></div>
                </div>

                {/* Block Card */}
                <div className="bg-stone-50/70 hover:bg-stone-50 border border-stone-200/90 rounded-xl p-4 transition shadow-2xs">
                  
                  {/* Block Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/90">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-xs text-[#13233f] bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        Block #{block.sequence_index}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono border border-stone-200/80">
                        {block.action}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      {block.timestamp}
                    </div>
                  </div>

                  {/* Cryptographic Hash Lineage */}
                  <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    
                    {/* Previous Entry Hash */}
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200/90">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block font-sans">
                        Previous Entry Hash
                      </span>
                      <div className="flex items-center justify-between text-stone-700 mt-1">
                        <span className="truncate text-stone-600">{block.previous_entry_hash}</span>
                        <button
                          onClick={() => handleCopyHash(block.previous_entry_hash)}
                          className="text-stone-400 hover:text-[#13233f] ml-1.5 shrink-0 cursor-pointer"
                          title="Copy hash"
                        >
                          {copiedHash === block.previous_entry_hash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Current Entry Hash */}
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200/90">
                      <span className="text-[10px] font-semibold text-[#13233f] uppercase tracking-wider block font-sans">
                        Current Entry Hash
                      </span>
                      <div className="flex items-center justify-between text-stone-900 font-semibold mt-1">
                        <span className="truncate">{block.entry_hash}</span>
                        <button
                          onClick={() => handleCopyHash(block.entry_hash)}
                          className="text-stone-400 hover:text-[#13233f] ml-1.5 shrink-0 cursor-pointer"
                          title="Copy hash"
                        >
                          {copiedHash === block.entry_hash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Actor Details */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-stone-600 py-1 font-sans">
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>Audited Actor:</span>
                      <span className="font-semibold text-stone-900 font-mono">{block.actor.username}</span>
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
                        {block.actor.role}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-stone-500">
                      <span>Target Household:</span>
                      <span className="font-semibold text-[#13233f]">{block.household_id}</span>
                    </div>
                  </div>

                  {/* Toggle State Delta Snippet */}
                  <div className="mt-3 pt-2.5 border-t border-stone-200/90">
                    <button
                      id={`toggle-delta-block-${block.sequence_index}`}
                      onClick={() => setExpandedBlockIndex(isExpanded ? null : block.sequence_index)}
                      className="text-xs font-semibold text-[#13233f] hover:text-[#13233f] flex items-center space-x-1 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide State Delta' : 'View State Delta JSON Diff'}</span>
                    </button>

                    {/* JSON State Delta Snippet (Before vs After) */}
                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                        
                        {/* State Before */}
                        <div className="bg-rose-50/60 border border-rose-200/90 rounded-lg p-3">
                          <div className="text-[10px] font-semibold text-rose-800 uppercase tracking-wide font-sans mb-1">
                            State Before:
                          </div>
                          <pre className="text-rose-950 overflow-x-auto">
                            {JSON.stringify(block.state_delta.before, null, 2)}
                          </pre>
                        </div>

                        {/* State After */}
                        <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-lg p-3">
                          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide font-sans mb-1">
                            State After:
                          </div>
                          <pre className="text-emerald-950 overflow-x-auto">
                            {JSON.stringify(block.state_delta.after, null, 2)}
                          </pre>
                        </div>

                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
};
