const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Key for comparing names regardless of diacritics, letter case and whitespace. */
export function toLookupKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Unifies training code variants like `bozp-z`, `BOZP_Z` or `BOZP Z` to `BOZP-Z`. */
export function normalizeTrainingCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s_]+/g, '-');
}

/**
 * Parses `2026-10-24`, `24. 10. 2026`, `24.10.2026` and Excel serial dates (`46319`) to ISO date.
 * Returns null for empty or invalid values (e.g. `31. 9. 2026`).
 */
export function parseDate(value: string): string | null {
  const trimmed = value.trim();
  let match: RegExpMatchArray | null;

  if ((match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if ((match = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/))) {
    return toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  }
  if (/^\d{5}$/.test(trimmed)) {
    return new Date(EXCEL_EPOCH + Number(trimmed) * DAY_MS).toISOString().slice(0, 10);
  }

  return null;
}

/** Adds months to ISO date; overflowing days are clamped to the end of the month (31. 1. + 1 month = 28. 2.). */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDayOfTargetMonth)));
  return date.toISOString().slice(0, 10);
}

/** Parses validity like `24`, `2 roky` or `5 let` to months. Zero or empty value means unlimited validity. */
export function parseValidityMonths(value: string): number | null {
  const match = toLookupKey(value).match(/^(\d+)\s*(rok|roky|let)?$/);
  if (!match) {
    return null;
  }

  const months = Number(match[1]) * (match[2] ? 12 : 1);
  return months > 0 ? months : null;
}

export function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Parses time range like `09:00-12:00`. */
export function parseTimeRange(value: string): { start: string; end: string } | null {
  const match = value.trim().match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
  return match ? { start: match[1].padStart(5, '0'), end: match[2].padStart(5, '0') } : null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}
