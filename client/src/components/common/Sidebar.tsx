import React from 'react';
import type { ScreenId } from '../../types/navigation';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Send, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Tablet, 
  ClipboardList, 
  RefreshCw,
  FileCheck2,
  Sliders,
  Users,
  Building2,
  ShieldCheck,
  Scale
} from 'lucide-react';

interface SidebarProps {
  userRole: 'DSWD_DIRECTOR' | 'MUNICIPAL_LINK' | 'COA_AUDITOR' | string;
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  pendingTriageCount?: number;
  dueProcessCount?: number;
  offlineSyncCount?: number;
  showSpecAnnotations?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  currentScreen,
  onSelectScreen,
  pendingTriageCount = 32,
  dueProcessCount = 3,
  offlineSyncCount = 1,
  showSpecAnnotations = false,
}) => {
  // Define role-specific navigation menus
  const getNavItems = () => {
    switch (userRole) {
      case 'DSWD_DIRECTOR':
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
            label: 'Triage & Flagged Queue',
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
            badge: `${dueProcessCount}`,
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
          },
          {
            id: 'admin_settings' as ScreenId,
            label: 'Policy Thresholds',
            sublabel: 'Cross-match sensitivity',
            icon: Sliders,
            badge: null
          }
        ];

      case 'MUNICIPAL_LINK':
        return [
          {
            id: 'field_dashboard' as ScreenId,
            label: 'Caseworker Hub',
            sublabel: 'Calamba assigned caseload',
            icon: LayoutDashboard,
            badge: '12 Cases'
          },
          {
            id: 'field_tasks' as ScreenId,
            label: 'Assigned Field Tasks',
            sublabel: 'Priority on-site visits',
            icon: ClipboardList,
            badge: '3 Pending',
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
            label: 'Offline Sync Queue',
            sublabel: 'IndexedDB local storage',
            icon: RefreshCw,
            badge: `${offlineSyncCount} Draft`,
            badgeColor: 'bg-stone-100 text-stone-700 border-stone-200'
          }
        ];

      case 'GRIEVANCE_OFFICER':
        return [
          {
            id: 'grievance_dashboard' as ScreenId,
            label: 'Grievance & Appeals Hub',
            sublabel: 'Statutory cases overview',
            icon: LayoutDashboard,
            badge: `${dueProcessCount} Active`,
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
          },
          {
            id: 'due_process' as ScreenId,
            label: '15-Day Due Process',
            sublabel: 'Notice of Ineligibility dockets',
            icon: Clock,
            badge: `${dueProcessCount}`,
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
          }
        ];

      case 'COA_AUDITOR':
        return [
          {
            id: 'coa_dashboard' as ScreenId,
            label: 'State Auditor Dashboard',
            sublabel: 'RA 11310 compliance metrics',
            icon: Scale,
            badge: '94.2%'
          },
          {
            id: 'audit_ledger' as ScreenId,
            label: 'Cryptographic Ledger',
            sublabel: 'SHA-256 Merkle chain',
            icon: ShieldCheck,
            badge: '100% Valid',
            badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
          },
          {
            id: 'coa_sampling' as ScreenId,
            label: 'Evidentiary Sampling',
            sublabel: 'Cross-match audit ledger',
            icon: FileCheck2,
            badge: '68.4%'
          }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleHeaderInfo = () => {
    switch (userRole) {
      case 'DSWD_DIRECTOR':
        return {
          title: 'Executive Administration',
          agency: 'DSWD Regional Director',
          jurisdiction: 'Region IV-A (Laguna Cluster)',
          accentColor: 'border-l-[#132e4f] text-[#132e4f]',
          badgeText: 'Admin Authority'
        };
      case 'MUNICIPAL_LINK':
        return {
          title: 'Field Operations',
          agency: 'Municipal Link Caseworker',
          jurisdiction: 'Calamba City Cluster',
          accentColor: 'border-l-emerald-700 text-emerald-700',
          badgeText: 'Field Caseworker'
        };
      case 'GRIEVANCE_OFFICER':
        return {
          title: 'Due Process & Appeals',
          agency: 'Grievance Redress Division',
          jurisdiction: 'Laguna Regional Appeals Unit',
          accentColor: 'border-l-amber-700 text-amber-950',
          badgeText: 'Appeals Officer'
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
    <aside className="w-64 bg-stone-50/90 border-r border-stone-200/90 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4.25rem)]">
      <div className="p-3.5 space-y-4">
        
        {/* Persona Authority Card */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Active Persona View
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
              {roleInfo.badgeText}
            </span>
          </div>
          <div className="text-xs font-bold text-stone-900 leading-tight">
            {roleInfo.agency}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            {roleInfo.jurisdiction}
          </div>
        </div>

        {/* Persona Navigation Group */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              {roleInfo.title}
            </h2>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onSelectScreen(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? `bg-white text-stone-900 font-semibold border border-stone-200/90 border-l-[3px] shadow-2xs ${
                          userRole === 'MUNICIPAL_LINK' 
                            ? 'border-l-emerald-700' 
                            : userRole === 'COA_AUDITOR' 
                            ? 'border-l-amber-700' 
                            : 'border-l-[#132e4f]'
                        }`
                      : 'text-stone-700 hover:bg-stone-100/80 hover:text-stone-900 font-normal'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive 
                        ? userRole === 'MUNICIPAL_LINK' ? 'text-emerald-700' : userRole === 'COA_AUDITOR' ? 'text-amber-700' : 'text-[#132e4f]'
                        : 'text-stone-400'
                    }`} />
                    <div className="truncate">
                      <div className="text-xs leading-tight truncate">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-stone-500' : 'text-stone-400'}`}>
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 border ${
                      isActive 
                        ? 'bg-stone-100 text-stone-800 border-stone-200' 
                        : 'bg-stone-200/70 text-stone-700 border-stone-300/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      </div>

      {/* Footer Info / Reference */}
      <div className="p-3 bg-white border-t border-stone-200/90 text-[11px] text-stone-500">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-stone-800 text-[10px]">DSWD Region IV-A</span>
          <span className="text-[10px] text-stone-500 font-mono">Laguna Cluster</span>
        </div>
        <p className="text-[10px] text-stone-400 leading-tight">
          Role-isolated interface pursuant to RA 11310 & COA 2024-008.
        </p>
      </div>
    </aside>
  );
};
