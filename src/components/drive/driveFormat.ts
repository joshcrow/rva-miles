// Display formatting for the driving cockpit. Numbers here are read at a
// glance from a moving car, so precision is deliberately low on screen (one
// decimal) and full precision is kept in the data layer.

/** "1:04:22" past an hour, "4:22" below it. Never negative. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatMiles(miles: number, digits = 1): string {
  const safe = Number.isFinite(miles) ? Math.max(0, miles) : 0;
  return safe.toFixed(digits);
}

export function formatMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `$${safe.toFixed(2)}`;
}

/** Local wall-clock time, e.g. "2:14 PM". Not a calendar date — safe to localize. */
export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "42s" / "3m 04s" — how stale the last accepted GPS fix is. */
export function formatAgo(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest < 10 ? "0" : ""}${rest}s`;
}
