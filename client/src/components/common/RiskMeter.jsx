import { getRiskLevel, formatPercent } from '../../utils/formatters.js';

const riskStyles = {
  low: 'bg-emerald-600',
  medium: 'bg-blue-600',
  high: 'bg-amber-600',
  critical: 'bg-rose-700',
};

export default function RiskMeter({ score }) {
  const level = getRiskLevel(score);
  const width = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className="min-w-32">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold capitalize text-slate-700">{level}</span>
        <span className="font-medium text-slate-500">{formatPercent(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${riskStyles[level]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
