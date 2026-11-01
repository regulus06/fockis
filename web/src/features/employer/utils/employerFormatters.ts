const valid = (value?: string | null) => Boolean(value) && !Number.isNaN(Date.parse(String(value)));

export const formatEmployerDate = (value?: string | null) =>
  valid(value)
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(String(value)))
    : '—';

export const formatEmployerDateTime = (value?: string | null, timeZone?: string) => {
  if (!valid(value)) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(new Date(String(value)));
  } catch {
    return new Date(String(value)).toLocaleString();
  }
};

export const formatEmployerTime = (value?: string | null, timeZone?: string) => {
  if (!valid(value)) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(
      new Date(String(value)),
    );
  } catch {
    return new Date(String(value)).toLocaleTimeString();
  }
};

export const formatEmployerNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : '—';

export const formatRelative = (value?: string | null) => {
  if (!valid(value)) return '';
  const diff = Date.now() - new Date(String(value)).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatEmployerDate(value);
};

export const formatShortDay = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
};

export const initials = (name?: string | null) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/** Value for <input type="date"> in local time. */
export const toDateInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toDateTimeInput = (value: string | Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
