import { describe, expect, it } from "vitest";
import type { PaySchedule } from "@/types";
import { periodContaining, periodPresets, previousPeriod } from "../periods";

describe("periodContaining — weekly", () => {
  const schedule: PaySchedule = { frequency: "weekly", anchorKey: "2026-01-05" }; // Monday

  it("returns the anchor's own 7-day cycle when key === anchor", () => {
    expect(periodContaining(schedule, "2026-01-05")).toEqual({
      startKey: "2026-01-05",
      endKey: "2026-01-11",
    });
  });

  it("returns the same range for the last day of the cycle", () => {
    expect(periodContaining(schedule, "2026-01-11")).toEqual({
      startKey: "2026-01-05",
      endKey: "2026-01-11",
    });
  });

  it("advances to the next cycle on the following day", () => {
    expect(periodContaining(schedule, "2026-01-12")).toEqual({
      startKey: "2026-01-12",
      endKey: "2026-01-18",
    });
  });

  it("handles keys before the anchor (negative cycle index)", () => {
    expect(periodContaining(schedule, "2026-01-01")).toEqual({
      startKey: "2025-12-29",
      endKey: "2026-01-04",
    });
  });

  it("handles keys far before the anchor across a year boundary", () => {
    // 2026-01-05 minus exactly 5 weekly cycles (35 days) lands on 2025-12-01.
    expect(periodContaining(schedule, "2025-12-01")).toEqual({
      startKey: "2025-12-01",
      endKey: "2025-12-07",
    });
  });
});

describe("periodContaining — biweekly", () => {
  const schedule: PaySchedule = { frequency: "biweekly", anchorKey: "2026-01-05" };

  it("returns a 14-day cycle from the anchor", () => {
    expect(periodContaining(schedule, "2026-01-05")).toEqual({
      startKey: "2026-01-05",
      endKey: "2026-01-18",
    });
  });

  it("advances a full cycle after 14 days", () => {
    expect(periodContaining(schedule, "2026-01-19")).toEqual({
      startKey: "2026-01-19",
      endKey: "2026-02-01",
    });
  });

  it("handles a key one cycle before the anchor", () => {
    expect(periodContaining(schedule, "2025-12-25")).toEqual({
      startKey: "2025-12-22",
      endKey: "2026-01-04",
    });
  });
});

describe("periodContaining — semimonthly", () => {
  const schedule: PaySchedule = { frequency: "semimonthly", anchorKey: "2020-01-01" };

  it("first half: 1st through 15th", () => {
    expect(periodContaining(schedule, "2026-08-01")).toEqual({
      startKey: "2026-08-01",
      endKey: "2026-08-15",
    });
    expect(periodContaining(schedule, "2026-08-15")).toEqual({
      startKey: "2026-08-01",
      endKey: "2026-08-15",
    });
  });

  it("second half: 16th through end of month", () => {
    expect(periodContaining(schedule, "2026-08-16")).toEqual({
      startKey: "2026-08-16",
      endKey: "2026-08-31",
    });
    expect(periodContaining(schedule, "2026-08-31")).toEqual({
      startKey: "2026-08-16",
      endKey: "2026-08-31",
    });
  });

  it("handles short months (Feb, non-leap)", () => {
    expect(periodContaining(schedule, "2026-02-20")).toEqual({
      startKey: "2026-02-16",
      endKey: "2026-02-28",
    });
  });

  it("handles leap-year February", () => {
    expect(periodContaining(schedule, "2024-02-20")).toEqual({
      startKey: "2024-02-16",
      endKey: "2024-02-29",
    });
  });

  it("anchor value is irrelevant to the calendar-fixed halves", () => {
    const otherAnchor: PaySchedule = { frequency: "semimonthly", anchorKey: "2026-07-03" };
    expect(periodContaining(otherAnchor, "2026-08-01")).toEqual(
      periodContaining(schedule, "2026-08-01"),
    );
  });
});

describe("periodContaining — monthly", () => {
  const schedule: PaySchedule = { frequency: "monthly", anchorKey: "2020-01-01" };

  it("returns the full calendar month", () => {
    expect(periodContaining(schedule, "2026-04-15")).toEqual({
      startKey: "2026-04-01",
      endKey: "2026-04-30",
    });
  });

  it("handles December correctly (year-end)", () => {
    expect(periodContaining(schedule, "2026-12-25")).toEqual({
      startKey: "2026-12-01",
      endKey: "2026-12-31",
    });
  });
});

describe("previousPeriod", () => {
  it("steps back one weekly cycle", () => {
    const schedule: PaySchedule = { frequency: "weekly", anchorKey: "2026-01-05" };
    const current = periodContaining(schedule, "2026-01-19");
    expect(previousPeriod(schedule, current)).toEqual({
      startKey: "2026-01-12",
      endKey: "2026-01-18",
    });
  });

  it("steps back one calendar month, including year rollover", () => {
    const schedule: PaySchedule = { frequency: "monthly", anchorKey: "2020-01-01" };
    const current = periodContaining(schedule, "2026-01-15");
    expect(previousPeriod(schedule, current)).toEqual({
      startKey: "2025-12-01",
      endKey: "2025-12-31",
    });
  });

  it("steps back one semimonthly half across a month boundary", () => {
    const schedule: PaySchedule = { frequency: "semimonthly", anchorKey: "2020-01-01" };
    const current = periodContaining(schedule, "2026-08-01"); // 1st-15th
    expect(previousPeriod(schedule, current)).toEqual({
      startKey: "2026-07-16",
      endKey: "2026-07-31",
    });
  });
});

describe("periodPresets", () => {
  it("without a schedule: always includes the four base presets, no period entries", () => {
    const presets = periodPresets(undefined, "2026-08-07");
    expect(presets.map((p) => p.label)).toEqual(["This month", "Last month", "Last 30 days", "Custom"]);
  });

  it("This month / Last month compute correctly, including a year rollover", () => {
    const presets = periodPresets(undefined, "2026-01-15");
    const byLabel = Object.fromEntries(presets.map((p) => [p.label, p.range]));
    expect(byLabel["This month"]).toEqual({ startKey: "2026-01-01", endKey: "2026-01-31" });
    expect(byLabel["Last month"]).toEqual({ startKey: "2025-12-01", endKey: "2025-12-31" });
  });

  it("Last 30 days spans exactly 30 inclusive days ending today", () => {
    const presets = periodPresets(undefined, "2026-08-07");
    const byLabel = Object.fromEntries(presets.map((p) => [p.label, p.range]));
    expect(byLabel["Last 30 days"]).toEqual({ startKey: "2026-07-09", endKey: "2026-08-07" });
  });

  it("with a schedule: prepends This period / Last period", () => {
    const schedule: PaySchedule = { frequency: "biweekly", anchorKey: "2026-01-05" };
    const presets = periodPresets(schedule, "2026-01-10");
    expect(presets.map((p) => p.label)).toEqual([
      "This period",
      "Last period",
      "This month",
      "Last month",
      "Last 30 days",
      "Custom",
    ]);
    expect(presets[0].range).toEqual(periodContaining(schedule, "2026-01-10"));
    expect(presets[1].range).toEqual(previousPeriod(schedule, presets[0].range));
  });
});
