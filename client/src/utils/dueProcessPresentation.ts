import type { DueProcessNoticeItem } from '../types/contracts';

export const SAMPLE_NOTICE_TIME = '2026-09-21T10:00:00+08:00';
const DAY = 24 * 60 * 60 * 1000;
const philippineDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function noticeCountdown(expiry: string, paused: boolean, now = SAMPLE_NOTICE_TIME) {
  if (paused) return { text: 'Countdown paused', urgent: false };
  const deadline = Date.parse(expiry);
  const current = Date.parse(now);
  if (!Number.isFinite(deadline) || !Number.isFinite(current)) return { text: 'Deadline unavailable', urgent: false };
  // A calendar-only deadline does not specify a cutoff hour. Do not invent one.
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    const days = Math.round((deadline - Date.parse(philippineDate.format(new Date(current)))) / DAY);
    return {
      text: days < 0 ? 'Deadline passed' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days remaining`,
      urgent: days <= 1,
    };
  }
  const difference = deadline - current;
  if (difference <= 0) return { text: 'Deadline passed', urgent: true };
  const hours = Math.floor(difference / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const hourText = `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`;
  return {
    text: hours === 0 ? 'Less than 1 hour remaining' : days === 0 ? `${hourText} remaining` : `${days} ${days === 1 ? 'day' : 'days'}${remainingHours ? `, ${hourText}` : ''} remaining`,
    urgent: difference < DAY,
  };
}

export function sortDueProcessNotices(notices: DueProcessNoticeItem[]): DueProcessNoticeItem[] {
  const deadline = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity;
  return [...notices].sort((a, b) =>
    Number(a.status === 'UNDER_APPEAL_HEARING') - Number(b.status === 'UNDER_APPEAL_HEARING') ||
    deadline(a.notice_expiry_date) - deadline(b.notice_expiry_date)
  );
}
