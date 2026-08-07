import { todayKey } from "./dates";

/**
 * IRS optional standard mileage rate for BUSINESS use, $/mile, by calendar
 * year. Official sources:
 *  2023: 0.655 — IRS Notice 2023-03 (IR-2022-234, Dec 29 2022)
 *  2024: 0.67  — IRS Notice 2024-08 (IR-2023-239, Dec 14 2023)
 *  2025: 0.70  — IRS Notice 2025-5 (IR-2024-312, Dec 19 2024)
 *               https://www.irs.gov/pub/irs-drop/n-25-05.pdf
 *  2026: 0.725 — IRS newsroom, "IRS sets 2026 business standard mileage rate
 *               at 72.5 cents per mile, up 2.5 cents" (verified via web
 *               search Aug 2026)
 *               https://www.irs.gov/newsroom/irs-sets-2026-business-standard-mileage-rate-at-725-cents-per-mile-up-25-cents
 */
export const IRS_RATES: Record<number, number> = {
  2023: 0.655,
  2024: 0.67,
  2025: 0.70,
  2026: 0.725,
};

const KNOWN_YEARS = Object.keys(IRS_RATES).map(Number);
const EARLIEST_YEAR = Math.min(...KNOWN_YEARS);
const LATEST_YEAR = Math.max(...KNOWN_YEARS);

/**
 * Default $/mile for a dateKey's year. Falls back to the nearest known year
 * (clamped) so trips logged before 2023 or after the newest published rate
 * still get a sane, non-zero default.
 */
export function defaultRateFor(key: string): number {
  const year = Number(key.slice(0, 4));
  const clamped = Math.min(Math.max(year, EARLIEST_YEAR), LATEST_YEAR);
  return IRS_RATES[clamped] ?? IRS_RATES[LATEST_YEAR];
}

/** Convenience: default rate for today's date, used to seed new Settings. */
export function currentDefaultRate(): number {
  return defaultRateFor(todayKey());
}
