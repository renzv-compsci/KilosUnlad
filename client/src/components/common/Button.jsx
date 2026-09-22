const variants = {
  primary: 'bg-dswd-navy text-white hover:bg-dswd-navy-dark focus:ring-blue-200',
  secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 focus:ring-stone-200',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-200',
  gold: 'bg-dswd-gold text-white hover:bg-amber-700 focus:ring-amber-200',
  ghost: 'text-stone-700 hover:bg-stone-100 focus:ring-stone-200',
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
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
