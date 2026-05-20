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

/**
 * Convert the local-time string from `<input type="datetime-local">`
 * (`YYYY-MM-DDTHH:MM`, no zone) into a proper UTC ISO string with `Z`.
 *
 * Why this matters: bare datetime-local values are interpreted as *local*
 * time by the spec, but on the Vercel server `new Date("...")` reads them
 * as UTC instead. Doing the conversion here on the client — where the
 * browser knows the user's actual timezone — produces a correct moment in
 * time that round-trips through Postgres and back to .toLocaleString().
 */
export function localDateTimeToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
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
