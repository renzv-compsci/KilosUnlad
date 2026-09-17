import triageContract from '../../../../docs/contracts/admin-web/admin-triage-feed.json';
import RiskMeter from '../../components/common/RiskMeter.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const triageData = triageContract.response.data;

export default function TriageQueue() {
  const items = triageData.items || [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-dswd-blue">Admin Web</p>
          <h2 className="text-2xl font-bold text-slate-950">Triage Queue</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Static contract preview for flagged 4Ps households. This will switch to the live API once
            the backend route is ready.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="High Risk" value={triageData.summary_metrics.high_risk_count} />
          <Metric label="Investigating" value={triageData.summary_metrics.under_investigation_count} />
          <Metric label="Notices" value={triageData.summary_metrics.notice_of_ineligibility_count} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <Th>Household</Th>
                <Th>Barangay</Th>
                <Th>SWDI</Th>
                <Th>Risk</Th>
                <Th>Triggers</Th>
                <Th>Flagged</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item) => (
                <tr className="align-top hover:bg-slate-50" key={item.household_id}>
                  <Td>
                    <p className="font-semibold text-slate-950">{item.household_id}</p>
                    <p className="text-sm text-slate-500">{item.head_of_household.full_name}</p>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{item.address.barangay}</p>
                    <p className="text-sm text-slate-500">
                      {item.address.municipality}, {item.address.province}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-sm text-slate-700">Current: Level {item.enrolled_swdi_level}</p>
                    <p className="text-sm text-slate-700">Predicted: Level {item.predicted_swdi_level}</p>
                  </Td>
                  <Td>
                    <RiskMeter score={item.composite_risk_score} />
                  </Td>
                  <Td>
                    <div className="flex max-w-md flex-wrap gap-2">
                      {item.trigger_badges.map((badge) => (
                        <StatusBadge key={badge.code} severity={badge.severity}>
                          {badge.label}
                        </StatusBadge>
                      ))}
                    </div>
                  </Td>
                  <Td>{formatDateTime(item.flagged_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xl font-bold text-slate-950">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-4 py-4 text-sm text-slate-700">{children}</td>;
}
