import React from 'react';

// KilosUnlad mark: a household roof over three rising steps (SWDI Level 1 → 3).
// The amber step is the program goal, self-sufficiency ("unlad": progress).
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="14" fill="#13233f" />
    <path d="M10 31 32 12.5 54 31" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="17" y="40" width="8" height="12" rx="1.6" fill="#fff" fillOpacity=".6" />
    <rect x="28" y="33" width="8" height="19" rx="1.6" fill="#fff" fillOpacity=".85" />
    <rect x="39" y="25" width="8" height="27" rx="1.6" fill="#a4661a" />
  </svg>
);

interface BrandLogoProps {
  size?: number;
  tone?: 'light' | 'dark';
  showWordmark?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 32, tone = 'light', showWordmark = true, className = '' }) => (
  <span className={`brand-logo brand-logo-${tone} ${className}`} role="img" aria-label="KilosUnlad">
    <BrandMark size={size} />
    {showWordmark && <span className="brand-logo-word" aria-hidden="true">Kilos<span className="brand-logo-accent">Unlad</span></span>}
  </span>
);
