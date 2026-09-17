export default function DashboardView() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-dswd-blue">Office Mode</p>
        <h2 className="text-2xl font-bold text-slate-950">Dashboard</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Base dashboard route is ready. Final metrics, maps, and visual design can be layered here
          once wireframes arrive.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Active Caseload" value="--" />
        <SummaryCard label="Flagged Households" value="--" />
        <SummaryCard label="Graduation Notices" value="--" />
      </div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
