import type { ScreenId } from '../types/navigation';

// One plain-language line per screen, shown in the header so anyone knows where they are
// and what the page is for.
export const SCREEN_GUIDE: Partial<Record<ScreenId, { title: string; hint: string }>> = {
  dashboard: { title: 'Executive Overview', hint: 'See how many households need attention and where they are.' },
  triage: { title: 'Triage Queue', hint: 'Open a flagged household to see why it was flagged.' },
  dispatch_manager: { title: 'Caseworker Dispatch', hint: 'Track home visits. New visits start from the Triage Queue.' },
  due_process: { title: '15-Day Due Process', hint: 'Watch notice deadlines and file appeals.' },
  admin_settings: { title: 'Policy Settings', hint: 'The thresholds and timers the system enforces.' },
  field_dashboard: { title: 'Field Overview', hint: 'Your visits, deadlines and saved reports at a glance.' },
  field_tasks: { title: 'Assigned Tasks', hint: 'Pick a household and start the home visit.' },
  field_verify: { title: '5-Step Field Form', hint: 'Answer each step, add a photo, then submit.' },
  field_sync: { title: 'Saved Drafts', hint: 'Reports on this device upload when you are online.' },
  coa_dashboard: { title: 'Audit Overview', hint: 'Register totals, model flags and the latest ledger blocks.' },
  audit_ledger: { title: 'Audit Verification', hint: 'Check that no ledger block was changed.' },
  coa_sampling: { title: 'Audit Sampling', hint: 'Inspect flagged households and their sealed explanations.' },
};
