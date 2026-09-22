import { ArrowRight, Building2, ClipboardCheck, MapPin, ShieldAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const triggerBreakdown = [
  { label: 'Utility breach', value: 16, color: 'bg-rose-700' },
  { label: 'Vehicle match', value: 11, color: 'bg-amber-600' },
  { label: 'Sangla-ATM', value: 5, color: 'bg-blue-700' },
];

const municipalities = [
  { name: 'Calamba City', count: 14, percent: '43.8%', status: 'Moratorium active' },
  { name: 'Santa Rosa', count: 8, percent: '25.0%', status: 'Field dispatching' },
  { name: 'San Pedro', count: 6, percent: '18.8%', status: 'Review queue' },
  { name: 'Los Banos', count: 3, percent: '9.4%', status: 'Appeal watch' },
  { name: 'Binan City', count: 1, percent: '3.1%', status: 'Low volume' },
];

export default function DashboardView() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-dswd-gold">
            Casework Intelligence / Q3 2026 Active Cycle
          </p>
          <h2 className="mt-1 text-3xl font-black text-stone-950">Executive Caseload & Compliance</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
            Laguna Provincial Cluster overview for 4Ps beneficiary auditing, cross-registry risk
            detection, and field verification oversight.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-dswd-navy px-4 py-2 text-sm font-bold text-white hover:bg-dswd-navy-dark"
          to="/triage"
        >
          Open Triage Queue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Statutory Moratorium Active (RA 10121): Calamba City</p>
        <p className="mt-1 text-amber-900">
          Field verification proceeds, but involuntary graduation and benefit delisting remain frozen
          during the local calamity recovery period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Active Beneficiaries" value="4,850" detail="Laguna Cluster monitoring" />
        <SummaryCard icon={ShieldAlert} label="Flagged for Review" value="32" detail="Risk score >= 70" tone="rose" />
        <SummaryCard icon={ClipboardCheck} label="Field Dispatches" value="12" detail="Municipal Links assigned" tone="emerald" />
        <SummaryCard icon={Building2} label="Graduated This Cycle" value="4" detail="67% of Q3 target" tone="gold" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Focused Visual Analytics</p>
              <h3 className="mt-1 text-xl font-bold text-stone-950">Cross-Match Discrepancy Matrix</h3>
              <p className="mt-1 text-sm text-stone-600">
                Flags are cross-referenced against utility consumption, vehicle registration, and
                field/loan-sharking reports.
              </p>
            </div>
            <span className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
              32 Total Flags
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {triggerBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-stone-700">{item.label}</span>
                  <span className="font-mono font-bold text-stone-950">{item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / 32) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Operations Geography</p>
              <h3 className="mt-1 text-xl font-bold text-stone-950">Laguna Cluster</h3>
            </div>
            <MapPin className="h-5 w-5 text-dswd-gold" />
          </div>
          <div className="mt-4 space-y-3">
            {municipalities.map((item) => (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={item.name}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-950">{item.name}</p>
                  <p className="font-mono text-sm font-bold text-dswd-navy">{item.count}</p>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
                  <span>{item.status}</span>
                  <span>{item.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function SummaryCard({ detail, icon: Icon, label, tone = 'navy', value }) {
  const toneClass = {
    navy: 'bg-blue-50 text-dswd-navy ring-blue-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    gold: 'bg-amber-50 text-amber-700 ring-amber-100',
  }[tone];

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-stone-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-black text-stone-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-stone-500">{detail}</p>
    </article>
  );
}
