import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import triageContract from '../../../../docs/contracts/admin-web/admin-triage-feed.json';
import Button from '../../components/common/Button.jsx';
import RiskMeter from '../../components/common/RiskMeter.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatDateTime, getRiskLevel, maskIdentifier, titleCase } from '../../utils/formatters.js';

const triageData = triageContract.response.data;

export default function TriageQueue() {
  const items = triageData.items || [];
  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const municipalities = ['ALL', ...new Set(items.map((item) => item.address.municipality))];

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const haystack = [
          item.household_id,
          item.head_of_household.full_name,
          item.head_of_household.national_id,
          item.address.barangay,
          item.address.municipality,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesMunicipality = municipality === 'ALL' || item.address.municipality === municipality;
        const matchesSeverity = severity === 'ALL' || getRiskLevel(item.composite_risk_score) === severity;
        return matchesQuery && matchesMunicipality && matchesSeverity;
      }),
    [items, municipality, query, severity],
  );

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-dswd-gold">Admin Web / ADM-02</p>
          <h2 className="mt-1 text-3xl font-black text-stone-950">Triage Queue & Flagged Cases</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
            Cross-match discrepancies from utility, vehicle, and SWDI signals. Personal identifiers
            are masked in table view for RA 10173 privacy safety.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="High Risk" value={triageData.summary_metrics.high_risk_count} />
          <Metric label="Investigating" value={triageData.summary_metrics.under_investigation_count} />
          <Metric label="Notices" value={triageData.summary_metrics.notice_of_ineligibility_count} />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              className="min-h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-dswd-navy focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search household, head, barangay, or ID"
              value={query}
            />
          </label>
          <select
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 outline-none focus:border-dswd-navy focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setMunicipality(event.target.value)}
            value={municipality}
          >
            {municipalities.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All Municipalities' : option}
              </option>
            ))}
          </select>
          <select
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 outline-none focus:border-dswd-navy focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setSeverity(event.target.value)}
            value={severity}
          >
            <option value="ALL">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-100">
              <tr>
                <Th>Household</Th>
                <Th>Barangay</Th>
                <Th>SWDI</Th>
                <Th>Risk</Th>
                <Th>Triggers</Th>
                <Th>Flagged</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {filteredItems.map((item) => (
                <tr className="align-top hover:bg-stone-50" key={item.household_id}>
                  <Td>
                    <p className="font-mono text-xs font-black text-dswd-navy">{item.household_id}</p>
                    <p className="mt-1 font-semibold text-stone-950">{item.head_of_household.full_name}</p>
                    <p className="text-xs text-stone-500">{maskIdentifier(item.head_of_household.national_id)}</p>
                  </Td>
                  <Td>
                    <p className="font-medium text-stone-800">{item.address.barangay}</p>
                    <p className="text-sm text-stone-500">
                      {item.address.municipality}, {item.address.province}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-sm text-stone-700">Current: Level {item.enrolled_swdi_level}</p>
                    <p className="text-sm text-stone-700">Predicted: Level {item.predicted_swdi_level}</p>
                  </Td>
                  <Td>
                    <RiskMeter score={item.composite_risk_score} />
                    <p className="mt-1 text-xs font-bold capitalize text-stone-500">
                      {titleCase(getRiskLevel(item.composite_risk_score))}
                    </p>
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
                  <Td>
                    <Button className="min-h-9 px-3 py-1.5 text-xs">Dispatch</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-500">
          <span>
            Showing {filteredItems.length} of {items.length} audited cases
          </span>
          <span>Contract source: admin-triage-feed.json</span>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xl font-black text-stone-950">{value}</p>
      <p className="text-xs font-bold text-stone-500">{label}</p>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-stone-500">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-4 py-4 text-sm text-stone-700">{children}</td>;
}
