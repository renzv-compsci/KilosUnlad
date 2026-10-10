import React from 'react';
import { Info } from 'lucide-react';
import type { ScreenId } from '../../types/navigation';

function sourceFor(screen: ScreenId) {
  if (screen === 'dashboard') return ['Server records + sample analytics', 'Workload counts and queued households come from the server. Regional charts and the map use labeled sample data.'];
  if (screen === 'audit_ledger') return ['Read-only verification', 'Verification checks the requested range on the server. No audit records are changed.'];
  if (screen === 'triage') return ['Server records', 'Households come from the server. Authorized dispatch creates an assignment and returns an audit receipt.'];
  if (screen === 'dispatch_manager') return ['Sample assignment overview', 'This list and staff counts are previews. Select Household opens live triage for authorized dispatch; reassignment is unavailable.'];
  if (screen === 'field_tasks' || screen === 'field_dashboard') return ['Server assignments', 'Tasks come from the server. Available offline means a copy is stored on this device; assessment drafts are not submitted.'];
  if (screen === 'field_verify' || screen === 'field_sync') return ['Local drafts only', 'Assessment drafts are saved on this device. Server submission is not available yet.'];
  if (screen === 'coa_dashboard') return ['Sample overview', 'Overview figures and AOMs are previews. Audit-chain verification uses a separate read-only server request.'];
  return ['Preview only', 'Sample records. Changes are not submitted to the server or applied to official records.'];
}

export function DataSourceNotice({ screen }: { screen: ScreenId }) {
  const [label, description] = sourceFor(screen);
  return <details className="data-source-note" key={screen}>
    <summary><Info size={15} aria-hidden="true" /><span>{label}</span></summary>
    <p>{description}</p>
  </details>;
}
