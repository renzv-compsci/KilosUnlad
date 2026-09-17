import { NavLink } from 'react-router-dom';
import { ClipboardList, FileCheck2, Gauge, MapPinned, Scale, ShieldCheck } from 'lucide-react';
import { ROLES } from '../../hooks/useAuth.js';

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: Gauge,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    label: 'Triage Queue',
    to: '/triage',
    icon: ClipboardList,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    label: 'Field Tasks',
    to: '/field-verification',
    icon: MapPinned,
    roles: [ROLES.SUPER_ADMIN, ROLES.CASE_WORKER],
  },
  {
    label: 'Appeals',
    to: '/appeals',
    icon: Scale,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    label: 'Audit Ledger',
    to: '/audit-ledger',
    icon: ShieldCheck,
    roles: [ROLES.SUPER_ADMIN, ROLES.COA_AUDITOR],
  },
];

export default function Sidebar({ role }) {
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-dswd-blue text-sm font-bold text-white">
            KU
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">KilosUnlad</p>
            <p className="text-xs text-slate-500">4Ps Welfare Audit MIS</p>
          </div>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {visibleItems.map((item) => {
          const Icon = item.icon || FileCheck2;

          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-dswd-blue'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`
              }
              key={item.to}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
