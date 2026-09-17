const variants = {
  primary: 'bg-dswd-blue text-white hover:bg-blue-800 focus:ring-blue-200',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200',
  danger: 'bg-dswd-red text-white hover:bg-red-700 focus:ring-red-200',
  ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-200',
};

export default function Button({
  children,
  className = '',
  disabled = false,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
