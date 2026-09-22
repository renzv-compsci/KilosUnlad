export function formatDateTime(value) {
  if (!value) return 'N/A';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }

  return `${Number(value).toFixed(0)}%`;
}

export function getRiskLevel(score) {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function maskIdentifier(value) {
  if (!value) return 'N/A';

  const raw = String(value);
  const last = raw.slice(-4);
  return `${raw.slice(0, Math.min(6, raw.length))}-****-****-${last}`;
}

export function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
