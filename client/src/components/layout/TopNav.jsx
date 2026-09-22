import { useAuth } from '../../hooks/useAuth.js';

export default function TopNav() {
  const { role, roles, setRole, user } = useAuth();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="flex min-h-9 items-center justify-between bg-dswd-navy px-4 text-[11px] font-semibold text-stone-100 lg:px-6">
        <span>An official website of the Republic of the Philippines</span>
        <span className="hidden text-amber-200 md:inline">RA 11310 Compliance • COA Audit Ready</span>
      </div>
      <div className="flex min-h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300 bg-dswd-navy text-[11px] font-black text-white">
            DSWD
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
              Republic of the Philippines
            </p>
            <h1 className="text-lg font-bold text-stone-950">KilosUnlad 4Ps Welfare Auditing MIS</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 outline-none focus:border-dswd-navy focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          >
            {Object.values(roles).map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption}
              </option>
            ))}
          </select>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-stone-950">{user.name}</p>
            <p className="text-xs font-medium text-stone-500">
              {user.label} • {user.jurisdiction}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
