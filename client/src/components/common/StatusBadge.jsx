const severityStyles = {
  LOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  CRITICAL: 'bg-slate-900 text-white ring-slate-900',
  DEFAULT: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function StatusBadge({ children, severity = 'DEFAULT' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${severityStyles[severity] || severityStyles.DEFAULT}`}
    >
      {children}
    </span>
  );
}
