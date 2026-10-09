import type { UserRole } from './contracts';
import type { ScreenId } from './navigation';

interface RoleConfig {
  defaultScreen: ScreenId;
  allowedScreens: ScreenId[];
  roleTitle: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  SUPER_ADMIN: {
    defaultScreen: 'dashboard',
    allowedScreens: ['dashboard', 'triage', 'dispatch_manager', 'dispatch_modal', 'due_process', 'admin_settings', 'audit_ledger'],
    roleTitle: 'Super Admin',
  },
  REGIONAL_DIRECTOR: {
    defaultScreen: 'dashboard',
    allowedScreens: ['dashboard', 'triage', 'dispatch_manager', 'dispatch_modal', 'due_process', 'admin_settings'],
    roleTitle: 'Regional Director',
  },
  CASE_WORKER: {
    defaultScreen: 'field_tasks',
    allowedScreens: ['field_dashboard', 'field_tasks', 'field_verify', 'field_sync'],
    roleTitle: 'Case Worker',
  },
  COA_AUDITOR: {
    defaultScreen: 'coa_dashboard',
    allowedScreens: ['coa_dashboard', 'triage', 'audit_ledger', 'coa_sampling'],
    roleTitle: 'COA Auditor',
  },
};

export function canReadTriage(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'COA_AUDITOR'].includes(role);
}

export function canDispatch(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'REGIONAL_DIRECTOR';
}
