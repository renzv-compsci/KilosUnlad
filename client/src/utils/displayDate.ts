const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
});

export function displayDate(value?: string | null): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
});

export function displayDateTime(value?: string | null): string {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return displayDate(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${dateTimeFormatter.format(date)} PHT`;
}
