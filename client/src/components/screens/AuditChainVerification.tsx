import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { apiErrorMessage } from '../../services/api';
import { parseAuditRange, verifyAuditChain, type AuditRange, type AuditVerification } from '../../services/auditVerification';
import { displayDateTime } from '../../utils/displayDate';

export function AuditChainVerification() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ range: AuditRange; data: AuditVerification } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function changeRange(value: string, setter: (value: string) => void) {
    request.current?.abort();
    setter(value);
    setBusy(false);
    setResult(null);
    setError(null);
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setResult(null);
    try {
      const range = parseAuditRange(start, end);
      setBusy(true);
      const data = await verifyAuditChain(range, controller.signal);
      if (!controller.signal.aborted) setResult({ range, data });
    } catch (cause) {
      if (!controller.signal.aborted) setError(apiErrorMessage(cause));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="module-page audit-verification">
    <header className="module-heading"><div><h2>Audit chain verification</h2><p>Read-only verification of stored audit records.</p></div></header>
    <form onSubmit={verify} className="audit-range-form" aria-busy={busy}>
      <label htmlFor="audit-start">Start sequence<input id="audit-start" inputMode="numeric" required value={start} onChange={e => changeRange(e.target.value, setStart)} aria-describedby="audit-range-note" /></label>
      <label htmlFor="audit-end">End sequence<input id="audit-end" inputMode="numeric" required value={end} onChange={e => changeRange(e.target.value, setEnd)} aria-describedby="audit-range-note" /></label>
      <button type="submit" disabled={busy} className="primary-triage-action">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <ShieldCheck size={18} />} {busy ? 'Verifying...' : 'Verify range'}</button>
    </form>
    <p id="audit-range-note">Up to 1,000 existing blocks per request. Partial ranges use the preceding block's recorded hash as their anchor.</p>
    {error && <p role="alert" className="audit-error">{error}</p>}
    {!result && !error && <p role="status">{busy ? 'Checking the requested range against the backend...' : 'No verification has been run.'}</p>}
    {result && <section aria-labelledby="audit-result-title" className="audit-result" data-valid={result.data.is_chain_valid}>
      <h3 id="audit-result-title" role="status">{result.data.is_chain_valid ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}{result.data.is_chain_valid ? 'Requested range verified' : 'Integrity mismatch detected'}</h3>
      <dl className="audit-result-summary"><div><dt>Sequence range</dt><dd>{result.range.start} to {result.range.end}</dd></div><div><dt>Blocks checked</dt><dd>{result.data.total_blocks_verified.toLocaleString()}</dd></div><div><dt>Checked at</dt><dd>{displayDateTime(result.data.verification_timestamp)}</dd></div></dl>
      <p>This result covers only the requested audit range, not the entire ledger or the current beneficiary records.</p>
      <details><summary>Hash details</summary><dl><dt>Genesis hash</dt><dd className="audit-hash">{result.data.genesis_hash}</dd><dt>Head hash</dt><dd className="audit-hash">{result.data.head_hash}</dd></dl></details>
      {result.data.broken_blocks.length > 0 && <ul className="audit-broken-blocks">{result.data.broken_blocks.map(block => <li key={block.sequence_index}><h4>Block {block.sequence_index}</h4><p>{block.target_entity || 'Entity not provided'}: {block.entity_id || 'ID not provided'}</p><details><summary>Mismatch details</summary><dl><dt>Recorded hash</dt><dd className="audit-hash">{block.recorded_hash || '(empty)'}</dd><dt>Calculated hash</dt><dd className="audit-hash">{block.calculated_hash}</dd></dl></details></li>)}</ul>}
    </section>}
  </div>;
}
