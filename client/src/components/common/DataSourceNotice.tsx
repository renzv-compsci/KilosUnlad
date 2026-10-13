import React from 'react';
import { Info } from 'lucide-react';
import type { ScreenId } from '../../types/navigation';

function sourceFor(screen: ScreenId) {
  if (screen === 'dashboard') return ['Server records', 'Every count, chart and map pin is computed by the server for your jurisdiction when the page loads.'];
  if (screen === 'audit_ledger') return ['Read-only verification', 'Verification checks the requested range on the server. No audit records are changed.'];
  if (screen === 'triage') return ['Server records', 'Households come from the server. Authorized dispatch creates an assignment and returns an audit receipt.'];
  if (screen === 'dispatch_manager') return ['Server records', 'Tasks and caseworkers come from the server for your jurisdiction. Select Household opens triage for dispatch; reassignment is unavailable.'];
  if (screen === 'field_tasks' || screen === 'field_dashboard') return ['Server assignments', 'Tasks come from the server. Available offline means a copy is stored on this device; saved reports are submitted automatically when online.'];
  if (screen === 'field_verify' || screen === 'field_sync') return ['Saved on device until synced', 'Reports are saved on this device first and submitted to the server when a connection is available.'];
  if (screen === 'coa_dashboard') return ['Server records (read-only)', 'Figures and ledger blocks come from the server. The AOM draft is not saved or sent: there is no AOM filing route.'];
  if (screen === 'coa_sampling') return ['Server records (read-only)', 'Flagged households and sealed explanations come from the server. Sampling decisions stay on this page and are not recorded.'];
  if (screen === 'grievance_dashboard' || screen === 'due_process') return ['Server records', 'The docket comes from the server. Filing an appeal seals an APPEAL_FILED block in the audit ledger.'];
  if (screen === 'admin_settings') return ['Server policy (read-only)', 'These are the values the server enforces. They are changed in the server configuration, not here.'];
  return ['Preview only', 'Sample records. Changes are not submitted to the server or applied to official records.'];
}

export function DataSourceNotice({ screen }: { screen: ScreenId }) {
  const [label, description] = sourceFor(screen);
  return <details className="data-source-note" key={screen}>
    <summary><Info size={15} aria-hidden="true" /><span>{label}</span></summary>
    <p>{description}</p>
  </details>;
}
