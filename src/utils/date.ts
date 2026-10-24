const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in local time as ISO date (`2026-10-24`). */
export function today(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Formats ISO date to Czech format (`24. 10. 2026`). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day}. ${month}. ${year}`;
}

/** Number of days from one ISO date to another, negative when `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}
