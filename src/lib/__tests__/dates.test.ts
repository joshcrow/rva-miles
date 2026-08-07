import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  compareKeys,
  formatKey,
  isKeyInRange,
  keyToDate,
  toDateKey,
  todayKey,
  weekdayOfKey,
} from "../dates";

describe("toDateKey / todayKey", () => {
  it("formats using local calendar components, zero-padded", () => {
    // 2026-01-05 12:00:00 local
    const ms = new Date(2026, 0, 5, 12, 0, 0).getTime();
    expect(toDateKey(ms)).toBe("2026-01-05");
  });

  it("does not shift across midnight in either direction", () => {
    const justAfterMidnight = new Date(2026, 5, 1, 0, 0, 1).getTime();
    const justBeforeMidnight = new Date(2026, 5, 1, 23, 59, 59).getTime();
    expect(toDateKey(justAfterMidnight)).toBe("2026-06-01");
    expect(toDateKey(justBeforeMidnight)).toBe("2026-06-01");
  });

  it("todayKey matches a manually computed local key", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    expect(todayKey()).toBe(expected);
  });
});

describe("keyToDate", () => {
  it("round-trips through toDateKey", () => {
    expect(toDateKey(keyToDate("2026-08-07").getTime())).toBe("2026-08-07");
  });

  it("throws on malformed keys", () => {
    expect(() => keyToDate("2026-8-7")).toThrow();
    expect(() => keyToDate("not-a-date")).toThrow();
    expect(() => keyToDate("")).toThrow();
  });

  it("sets time to local noon", () => {
    const d = keyToDate("2026-03-01");
    expect(d.getHours()).toBe(12);
  });
});

describe("addDaysKey — DST boundaries", () => {
  it("spring-forward (US, 2026-03-08 2am->3am) does not skip or repeat a day", () => {
    expect(addDaysKey("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDaysKey("2026-03-08", 1)).toBe("2026-03-09");
  });

  it("fall-back (US, 2026-11-01) does not skip or repeat a day", () => {
    expect(addDaysKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysKey("2026-11-01", 1)).toBe("2026-11-02");
  });

  it("crosses a DST boundary correctly over a longer span", () => {
    expect(addDaysKey("2026-03-01", 10)).toBe("2026-03-11");
  });

  it("handles negative deltas and month/year rollovers", () => {
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysKey("2024-03-01", -1)).toBe("2024-02-29"); // leap year
  });

  it("handles a full year of +1-day steps without drift", () => {
    let key = "2026-01-01";
    for (let i = 0; i < 365; i++) {
      key = addDaysKey(key, 1);
    }
    expect(key).toBe("2027-01-01");
  });
});

describe("compareKeys", () => {
  it("orders chronologically", () => {
    expect(compareKeys("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareKeys("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
    expect(compareKeys("2026-01-01", "2026-01-01")).toBe(0);
  });
});

describe("isKeyInRange", () => {
  const range = { startKey: "2026-08-01", endKey: "2026-08-15" };

  it("includes both endpoints (inclusive range)", () => {
    expect(isKeyInRange("2026-08-01", range)).toBe(true);
    expect(isKeyInRange("2026-08-15", range)).toBe(true);
  });

  it("includes interior dates and excludes outside dates", () => {
    expect(isKeyInRange("2026-08-08", range)).toBe(true);
    expect(isKeyInRange("2026-07-31", range)).toBe(false);
    expect(isKeyInRange("2026-08-16", range)).toBe(false);
  });
});

describe("weekdayOfKey", () => {
  it("returns 0 for Sunday, matching Date#getDay()", () => {
    // 2026-08-02 is a Sunday
    expect(weekdayOfKey("2026-08-02")).toBe(0);
    expect(weekdayOfKey("2026-08-07")).toBe(5); // Friday
  });
});

describe("formatKey", () => {
  it("short style", () => {
    expect(formatKey("2026-08-07", "short")).toBe("Aug 7");
  });

  it("long style", () => {
    expect(formatKey("2026-08-07", "long")).toBe("August 7, 2026");
  });

  it("weekday style", () => {
    expect(formatKey("2026-08-07", "weekday")).toBe("Friday");
  });
});
