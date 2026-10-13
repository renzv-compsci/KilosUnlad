import React from 'react';
import type { ScreenId } from '../../types/navigation';
import type { UserRole } from '../../types/contracts';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ClipboardList, 
  RefreshCw,
  FileCheck2,
  Sliders,
  Users,
  ShieldCheck,
  Scale
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole: UserRole;
  jurisdiction: string;
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  pendingTriageCount?: number;
  assignedTasksCount?: number;
  dueProcessCount?: number;
  offlineSyncCount?: number;
  showSpecAnnotations?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  userRole,
  jurisdiction,
  currentScreen,
  onSelectScreen,
  pendingTriageCount = 0,
  assignedTasksCount = 0,
  dueProcessCount = 0,
  offlineSyncCount = 0,
  showSpecAnnotations = false,
}) => {
  // Define role-specific navigation menus
  const getNavItems = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
      case 'REGIONAL_DIRECTOR':
        return [
          {
            id: 'dashboard' as ScreenId,
            label: 'Executive Overview',
            sublabel: 'Regional casemix & LGU map',
            icon: LayoutDashboard,
            badge: null
          },
          {
            id: 'triage' as ScreenId,
            label: 'Triage Queue',
            sublabel: 'Discrepancies (Si ≥ 70)',
            icon: AlertTriangle,
            badge: `${pendingTriageCount}`,
            badgeColor: 'bg-rose-50 text-rose-800 border-rose-200'
          },
          {
            id: 'dispatch_manager' as ScreenId,
            label: 'Caseworker Dispatch',
            sublabel: 'Field assignments & deadlines',
            icon: Users,
            badge: 'Admin',
            badgeColor: 'bg-stone-100 text-stone-700 border-stone-200'
          },
          {
            id: 'due_process' as ScreenId,
            label: '15-Day Due Process',
            sublabel: 'Statutory appeals dockets',
            icon: Clock,
            badge: 'Live',
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
          },
          {
            id: 'admin_settings' as ScreenId,
            label: 'Policy Settings',
            sublabel: 'Enforced thresholds',
            icon: Sliders,
            badge: null
          },
          ...(userRole === 'SUPER_ADMIN' ? [{ id: 'audit_ledger' as ScreenId, label: 'Audit Verification', sublabel: 'Read-only chain check', icon: ShieldCheck, badge: null }] : [])
        ];

      case 'CASE_WORKER':
        return [
          {
            id: 'field_dashboard' as ScreenId,
            label: 'Field Overview',
            sublabel: 'Your assigned caseload',
            icon: LayoutDashboard,
            badge: `${assignedTasksCount} ${assignedTasksCount === 1 ? 'task' : 'tasks'}`
          },
          {
            id: 'field_tasks' as ScreenId,
            label: 'Assigned Tasks',
            sublabel: 'Priority on-site visits',
            icon: ClipboardList,
            badge: `${assignedTasksCount}`,
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
          },
          {
            id: 'field_verify' as ScreenId,
            label: '5-Step Field Form',
            sublabel: 'Digital SWDI checklist',
            icon: CheckCircle2,
            badge: 'Active'
          },
          {
            id: 'field_sync' as ScreenId,
            label: 'Saved Drafts',
            sublabel: 'Stored on this device',
            icon: RefreshCw,
            badge: `${offlineSyncCount} ${offlineSyncCount === 1 ? 'draft' : 'drafts'}`,
            badgeColor: 'bg-stone-100 text-stone-700 border-stone-200'
          }
        ];

      case 'COA_AUDITOR':
        return [
          {
            id: 'triage' as ScreenId,
            label: 'Triage & Flagged Queue',
            sublabel: 'Read-only review',
            icon: AlertTriangle,
            badge: `${pendingTriageCount}`
          },
          {
            id: 'coa_dashboard' as ScreenId,
            label: 'Audit Overview',
            sublabel: 'Register, flags & ledger',
            icon: Scale,
            badge: null
          },
          {
            id: 'audit_ledger' as ScreenId,
            label: 'Audit Verification',
            sublabel: 'Read-only chain check',
            icon: ShieldCheck,
            badge: null
          },
          {
            id: 'coa_sampling' as ScreenId,
            label: 'Audit Sampling',
            sublabel: 'Flagged households & evidence',
            icon: FileCheck2,
            badge: null
          }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleHeaderInfo = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
      case 'REGIONAL_DIRECTOR':
        return {
          title: 'Executive Administration',
          agency: userRole === 'SUPER_ADMIN' ? 'System Administrator' : 'DSWD Regional Director',
          jurisdiction: 'Region IV-A (Laguna Cluster)',
          accentColor: 'border-l-[#132e4f] text-[#132e4f]',
          badgeText: 'Admin Authority'
        };
      case 'CASE_WORKER':
        return {
          title: 'Field Operations',
          agency: 'Municipal Link Caseworker',
          jurisdiction: 'Calamba City Cluster',
          accentColor: 'border-l-emerald-700 text-emerald-700',
          badgeText: 'Field Caseworker'
        };
      case 'COA_AUDITOR':
        return {
          title: 'State Audit Oversight',
          agency: 'Commission on Audit (COA)',
          jurisdiction: 'Special Audit Unit',
          accentColor: 'border-l-amber-700 text-amber-700',
          badgeText: 'State Auditor'
        };
      default:
        return {
          title: 'User Portal',
          agency: 'Republic of the Philippines',
          jurisdiction: 'Public Service',
          accentColor: 'border-l-stone-700 text-stone-700',
          badgeText: 'User'
        };
    }
  };

  const roleInfo = getRoleHeaderInfo();

  return (
    <aside
      id="app-sidebar"
      className={`app-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      tabIndex={0}
      aria-label={`Sidebar, ${collapsed ? 'collapsed' : 'expanded'}. Press Enter or Space to toggle.`}
      onClick={(event) => {
        // Ignore navigation clicks, including their nested labels and SVG icons.
        if ((event.target as Element).closest('button, a')) return;
        onToggleCollapse();
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          if (!event.repeat) onToggleCollapse();
        }
      }}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === 'transform' && !collapsed && window.matchMedia('(max-width: 767px)').matches) {
          event.currentTarget.focus();
        }
      }}
    >
      <div className="sidebar-brand" title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
        <span className="sidebar-wordmark">KilosUnlad<span className="brand-period">.</span></span>
      </div>

      <div className="sidebar-section-label">{roleInfo.title}</div>
      <nav id="sidebar-navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          const badge = item.badge !== 'Admin' && item.badge !== 'Active' ? item.badge : null;
          return (
            <button
              key={item.id}
              type="button"
              id={`nav-item-${item.id}`}
              aria-label={`${item.label}${badge ? `, ${badge}` : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectScreen(item.id)}
              className="sidebar-nav-item"
            >
              <Icon size={20} aria-hidden="true" />
              <span className="nav-copy">{item.label}</span>
              {badge && <span className="nav-count">{badge}</span>}
              {collapsed && <span className="nav-tooltip" aria-hidden="true">{item.label}{badge ? ` (${badge})` : ''}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-dot" aria-hidden="true" />
        <div><strong>{roleInfo.agency}</strong><span>{jurisdiction}</span></div>
      </div>
    </aside>
  );
};
