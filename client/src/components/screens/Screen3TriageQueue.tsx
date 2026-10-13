import React, { useEffect, useState } from 'react';
import { AssessmentExplanation, BeneficiaryTriageItem, TriagePagination } from '../../types/contracts';
import { Search, Send, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Screen3TriageQueueProps {
  onDispatchTask: (item: BeneficiaryTriageItem) => void;
  showSpecAnnotations?: boolean;
  items?: BeneficiaryTriageItem[];
  readOnly?: boolean;
  pagination?: TriagePagination;
  onPageChange?: (page: number) => void;
  // E2E-04: sealed SHAP explanation for the expanded row (null = none sealed yet).
  loadExplanation?: (householdId: string, signal: AbortSignal) => Promise<AssessmentExplanation | null>;
}

type ExplanationState = { status: 'loading' } | { status: 'ready'; data: AssessmentExplanation | null } | { status: 'error' };

const indicatorLabel = (indicator: string) => indicator.replace(/^demographics\./, '').replace(/_/g, ' ');

const ExplanationSection: React.FC<{ state?: ExplanationState }> = ({ state }) => {
  if (!state || state.status === 'loading') return <div><h3>Model explanation</h3><p>Loading sealed explanation…</p></div>;
  if (state.status === 'error') return <div><h3>Model explanation</h3><p>The sealed explanation could not be loaded or failed hash verification.</p></div>;
  const data = state.data;
  if (!data) return <div><h3>Model explanation</h3><p>No sealed model assessment for this household yet.</p></div>;
  if (data.evaluation_mode !== 'ML_MODEL') {
    return <div><h3>Model explanation</h3><p>Evaluated via fallback ({data.fallback_reason ?? 'ML unavailable'}); no SHAP attribution.</p></div>;
  }
  return <div className="triage-explanation">
    <h3>Model explanation (SHAP, predicted Level {data.predicted_swdi_level})</h3>
    <ul>{data.shap_explainability.map(item => <li key={item.indicator}>
      <strong>{indicatorLabel(item.indicator)}: <span data-shap-weight={item.contribution_weight}>{item.contribution_weight >= 0 ? '+' : ''}{item.contribution_weight.toFixed(3)}</span></strong>
      <p>{item.description}</p>
    </li>)}</ul>
    <p>Sealed in audit block #{data.audit_receipt.sequence_index}.</p>
  </div>;
};

export const Screen3TriageQueue: React.FC<Screen3TriageQueueProps> = ({
  onDispatchTask, showSpecAnnotations = false, items = [], readOnly = false, pagination, onPageChange, loadExplanation,
}) => {
  const [explanations, setExplanations] = useState<Record<string, ExplanationState>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [expandedHousehold, setExpandedHousehold] = useState<string | null>(null);

  useEffect(() => {
    if (!loadExplanation || !expandedHousehold || explanations[expandedHousehold]) return;
    const householdId = expandedHousehold;
    const controller = new AbortController();
    setExplanations(current => ({ ...current, [householdId]: { status: 'loading' } }));
    loadExplanation(householdId, controller.signal)
      .then(data => setExplanations(current => ({ ...current, [householdId]: { status: 'ready', data } })))
      .catch(() => { if (!controller.signal.aborted) setExplanations(current => ({ ...current, [householdId]: { status: 'error' } })); });
    return () => controller.abort();
  }, [expandedHousehold, loadExplanation]);
  const query = searchQuery.trim().toLowerCase();
  const hasFilters = Boolean(query || municipalityFilter !== 'ALL' || severityFilter !== 'ALL');
  const municipalities = [...new Set(items.map((item) => item.address.municipality))].sort();
  const filteredItems = items.filter((item) =>
    [item.household_id, item.head_of_household.full_name, item.head_of_household.national_id]
      .some((value) => value.toLowerCase().includes(query)) &&
    (municipalityFilter === 'ALL' || item.address.municipality === municipalityFilter) &&
    (severityFilter === 'ALL' || item.severity === severityFilter)
  );
  const clearFilters = () => {
    setSearchQuery('');
    setMunicipalityFilter('ALL');
    setSeverityFilter('ALL');
  };

  return (
    <div className="triage-workspace">
      {showSpecAnnotations && <p className="preview-note">GET /api/v1/beneficiaries/triage-queue</p>}
      <header className="triage-toolbar">
        <div className="triage-title-row">
          <div>
            <h2>Triage Queue <span className="quiet-count">{pagination?.total_records ?? items.length} flagged cases</span></h2>
            <p>Flagged households and cross-match findings.</p>
          </div>
        </div>
        <div className="triage-filters">
          <label className="triage-search" htmlFor="triage-search-input">
            <span>Search current page</span>
            <div><Search size={18} aria-hidden="true" />
              <input id="triage-search-input" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search current page" placeholder="Name, household ID or PhilSys ID" />
            </div>
          </label>
          <label htmlFor="triage-municipality-select"><span>Municipality</span>
            <select id="triage-municipality-select" aria-label="Municipality on current page" value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)}>
              <option value="ALL">All municipalities</option>
              {municipalityFilter !== 'ALL' && !municipalities.includes(municipalityFilter) && <option value={municipalityFilter}>{municipalityFilter}</option>}
              {municipalities.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label htmlFor="triage-severity-select"><span>Severity</span>
            <select id="triage-severity-select" aria-label="Severity on current page" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="ALL">All severity levels</option>
              <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
          </label>
        </div>
        <div className="triage-filter-note"><span>Filters apply to the current page.</span>{hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>
      </header>

      <div className="triage-results">
        <table className="triage-record-table" role="table" aria-label="Flagged households">
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Beneficiary</th><th scope="col" role="columnheader">Location</th><th scope="col" role="columnheader">Risk</th><th scope="col" role="columnheader">Actions</th></tr></thead>
          <tbody role="rowgroup">
            {filteredItems.length === 0 && <tr role="row" className="triage-empty"><td role="cell" colSpan={4}>
              <strong>{hasFilters ? 'No matching households on this page' : 'No flagged households on this page'}</strong>
              {hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}
            </td></tr>}
            {filteredItems.map((item) => {
              const expanded = expandedHousehold === item.household_id;
              const detailsId = `triage-details-${item.household_id}`;
              return <React.Fragment key={item.household_id}>
                <tr role="row" className="triage-record" data-expanded={expanded}>
                  <td role="cell" className="triage-identity"><strong>{item.head_of_household.full_name}</strong><span>{item.household_id}</span></td>
                  <td role="cell" className="triage-location"><span className="triage-mobile-label">Location</span><strong>{item.address.municipality}</strong><span>{item.address.barangay}, {item.address.province}</span></td>
                  <td role="cell" className="triage-risk"><span className="triage-mobile-label">Risk</span><strong>{item.composite_risk_score.toFixed(1)}<small> / 100</small></strong><span className={`triage-severity severity-${item.severity.toLowerCase()}`}>{item.severity.charAt(0) + item.severity.slice(1).toLowerCase()}</span></td>
                  <td role="cell" className="triage-actions">
                    {readOnly ? <span className="triage-read-only">Read-only</span> : <button type="button" id={`dispatch-task-btn-${item.household_id}`} className="triage-dispatch" onClick={() => onDispatchTask(item)}><Send size={15} aria-hidden="true" />Dispatch</button>}
                    <button type="button" className="triage-details-toggle" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'View'} details for ${item.head_of_household.full_name}`} onClick={() => setExpandedHousehold(expanded ? null : item.household_id)}>Details <ChevronDown size={16} aria-hidden="true" /></button>
                  </td>
                </tr>
                <tr role="row" id={detailsId} hidden={!expanded} className="triage-detail-row"><td role="cell" colSpan={4}>
                  <div className="triage-detail-content">
                    <dl><div><dt>PhilSys ID</dt><dd>{item.head_of_household.national_id}</dd></div><div><dt>Enrolled SWDI</dt><dd>{item.enrolled_swdi_level}</dd></div><div><dt>Predicted SWDI</dt><dd>{item.predicted_swdi_level}</dd></div></dl>
                    <div><h3>Cross-match findings</h3>{item.trigger_badges.length ? <ul>{item.trigger_badges.map((badge, index) => <li key={`${badge.type}-${index}`}><strong>{badge.label}</strong>{badge.detail !== badge.label && <p>{badge.detail}</p>}</li>)}</ul> : <p>No trigger details provided.</p>}</div>
                    {loadExplanation && expanded && <ExplanationSection state={explanations[item.household_id]} />}
                  </div>
                </td></tr>
              </React.Fragment>;
            })}
          </tbody>
        </table>
        <footer className="triage-pagination">
          <span role="status"><strong>{filteredItems.length}</strong> matching on this page &middot; <strong>{pagination?.total_records ?? items.length}</strong> total records</span>
          {pagination && onPageChange && <div>
            <button type="button" className="icon-control" aria-label="Previous page" title="Previous page" disabled={pagination.current_page <= 1} onClick={() => onPageChange(pagination.current_page - 1)}><ChevronLeft size={18} /></button>
            <span>Page {pagination.current_page} of {Math.max(1, pagination.total_pages)}</span>
            <button type="button" className="icon-control" aria-label="Next page" title="Next page" disabled={pagination.current_page >= pagination.total_pages} onClick={() => onPageChange(pagination.current_page + 1)}><ChevronRight size={18} /></button>
          </div>}
        </footer>
      </div>
      <details className="context-details"><summary>Statutory notice requirement</summary><p>Mandatory notice under RA 11310 Sec. 12.</p></details>
    </div>
  );
};
