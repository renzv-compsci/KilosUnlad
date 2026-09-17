export default function InputField({ id, label, error, className = '', ...props }) {
  return (
    <label className={`block space-y-1.5 ${className}`} htmlFor={id}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-dswd-blue focus:ring-4 focus:ring-blue-100"
        id={id}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-dswd-red">{error}</span> : null}
    </label>
  );
}
