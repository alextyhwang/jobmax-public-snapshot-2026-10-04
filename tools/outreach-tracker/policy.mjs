export const TIME_ZONE = 'America/New_York';

export function calendarDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid timestamp');
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Business days mean Monday-Friday in New York; holidays can be supplied explicitly.
export function addBusinessDays(value, count, holidays = []) {
  const date = new Date(`${calendarDate(value)}T12:00:00Z`);
  while (count > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay()) && !holidays.includes(date.toISOString().slice(0, 10))) count--;
  }
  return date.toISOString().slice(0, 10);
}

export function nextAction(message, tracking, now = new Date()) {
  if (message.declinedAt || message.bouncedAt || message.repliedAt) return { status: 'stopped', reason: 'Reply, decline, or bounce recorded' };
  if (message.followupSentAt) return { status: 'complete', reason: 'The single follow-up has been sent' };
  if (!message.sentAt) {
    if (!message.noteSentAt) return { status: 'draft', reason: 'Review the package and reconcile existing LinkedIn history' };
    const due = addBusinessDays(message.noteSentAt, 3);
    return { status: calendarDate(now) >= due ? 'email-due' : 'waiting', due, reason: 'Email three business days after the note, if no conversation has started' };
  }
  if (tracking?.reportedOpens > 0) return { status: 'stopped', reason: 'Reported open: no follow-up' };
  if (!tracking?.coverageHealthy || tracking?.ambiguous) return { status: 'unknown', reason: 'Tracking is unavailable, has a coverage gap, or includes a sender preview' };
  const due = addBusinessDays(message.sentAt, 7);
  return { status: calendarDate(now) >= due ? 'followup-due' : 'waiting', due, reason: 'One follow-up only, with no reported open or reply' };
}

export function validEmail(value) {
  return typeof value === 'string' && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value) && value.length <= 254;
}

export function timestamp(value, now = Date.now()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > now + 5000) throw new Error('Use an actual timestamp, not a future date');
  return date.toISOString();
}
