// Helpers for converting between ISO strings and the local-time formats
// expected by HTML date / datetime-local inputs.

/** Current local time formatted as `YYYY-MM-DDTHH:MM` for `<input type="datetime-local">`. */
export function nowLocalDateTime(): string {
  return isoToLocalDateTime(new Date().toISOString());
}

/** Current local date formatted as `YYYY-MM-DD` for `<input type="date">`. */
export function todayLocalDate(): string {
  return nowLocalDateTime().slice(0, 10);
}

/** Convert any ISO timestamp to the `YYYY-MM-DDTHH:MM` local form. */
export function isoToLocalDateTime(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** "just now" / "3 min ago" / "2h ago" / "5d ago" — short relative phrasing. */
export function relativeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "in the future";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
