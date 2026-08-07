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

/**
 * A $/mile rate as an exact decimal string — "0.70", "0.725", "0.655".
 *
 * Published IRS rates are quoted in whole or HALF cents (2026 is 72.5¢), so
 * formatting a rate like ordinary money loses the half cent: 0.725 renders as
 * "0.72" and the report stops reconciling — miles x the printed rate no longer
 * equals the printed amount. Rates therefore keep up to 3 decimals, padded to
 * a minimum of 2 so they still read as money.
 */
export function formatRateDigits(rate: number): string {
  const safe = Number.isFinite(rate) ? rate : 0;
  const text = (Math.round(safe * 1000) / 1000).toFixed(3);
  // Always 3 decimals, minus a single trailing zero => 2dp normally, 3dp for
  // a half cent. Never strips a second zero, so "$0.70" keeps its cents.
  return text.endsWith("0") ? text.slice(0, -1) : text;
}

/** The same value with a leading `$`, for anywhere it's shown as money. */
export function formatRate(rate: number): string {
  return `$${formatRateDigits(rate)}`;
}

/** Convenience: default rate for today's date, used to seed new Settings. */
export function currentDefaultRate(): number {
  return defaultRateFor(todayKey());
}
