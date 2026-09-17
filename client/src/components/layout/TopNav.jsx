import { useAuth } from '../../hooks/useAuth.js';

export default function TopNav() {
  const { role, roles, setRole, user } = useAuth();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Presentation Layer</p>
        <h1 className="text-lg font-semibold text-slate-950">Frontend Workbench</h1>
      </div>
      <div className="flex items-center gap-3">
        <select
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-dswd-blue focus:ring-4 focus:ring-blue-100"
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
          <p className="text-sm font-semibold text-slate-950">{user.name}</p>
          <p className="text-xs text-slate-500">{user.jurisdiction}</p>
        </div>
      </div>
    </header>
  );
}
