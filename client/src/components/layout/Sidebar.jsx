import { NavLink } from 'react-router-dom';
import { ClipboardList, FileCheck2, Gauge, MapPinned, Scale, ShieldCheck } from 'lucide-react';
import { ROLES } from '../../hooks/useAuth.js';

const navItems = [
  {
    section: 'Executive Administration',
    label: 'Executive Overview',
    description: 'Regional casemix & LGU map',
    to: '/dashboard',
    icon: Gauge,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    section: 'Executive Administration',
    label: 'Triage & Flagged Queue',
    description: 'Discrepancies scoring 70+',
    to: '/triage',
    icon: ClipboardList,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    section: 'Field PWA',
    label: 'Field Tasks',
    description: 'Offline verification forms',
    to: '/field-verification',
    icon: MapPinned,
    roles: [ROLES.SUPER_ADMIN, ROLES.CASE_WORKER],
  },
  {
    section: 'Due Process',
    label: '15-Day Due Process',
    description: 'Appeals and notices',
    to: '/appeals',
    icon: Scale,
    roles: [ROLES.SUPER_ADMIN, ROLES.REGIONAL_DIRECTOR],
  },
  {
    section: 'Audit Oversight',
    label: 'Audit Ledger',
    description: 'COA hash-chain inspector',
    to: '/audit-ledger',
    icon: ShieldCheck,
    roles: [ROLES.SUPER_ADMIN, ROLES.COA_AUDITOR],
  },
];

export default function Sidebar({ role }) {
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const sections = [...new Set(visibleItems.map((item) => item.section))];

  return (
    <aside className="hidden w-80 shrink-0 border-r border-stone-200 bg-white lg:block">
      <div className="border-b border-stone-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-dswd-navy text-sm font-black text-white ring-2 ring-dswd-gold/30">
            KU
          </div>
          <div>
            <p className="text-sm font-bold text-stone-950">KilosUnlad</p>
            <p className="text-xs font-medium text-stone-500">DSWD Region IV-A Laguna Cluster</p>
          </div>
        </div>
      </div>
      <nav className="space-y-5 p-4">
        {sections.map((section) => (
          <div key={section}>
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">
              {section}
            </p>
            <div className="space-y-1">
              {visibleItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon || FileCheck2;

                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? 'border border-blue-100 bg-blue-50 text-dswd-navy shadow-sm'
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                        }`
                      }
                      key={item.to}
                      to={item.to}
                    >
                      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                      <span>
                        <span className="block font-bold">{item.label}</span>
                        <span className="block text-xs text-stone-500">{item.description}</span>
                      </span>
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
