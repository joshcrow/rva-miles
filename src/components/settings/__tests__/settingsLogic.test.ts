import { describe, expect, it } from "vitest";
import {
  daysAgoLabel,
  formatBytes,
  generateSyncCode,
  isBackupStale,
  isDateKeyString,
  lastSyncedLabel,
  mergePreviewText,
  mergeResultText,
  parseRateInput,
  periodPreviewLabel,
} from "../settingsLogic";

const DAY_MS = 86_400_000;

describe("daysAgoLabel", () => {
  // Rendered after "Last backup: ", so every branch has to be a bare value.
  it("says never when unset", () => {
    expect(daysAgoLabel(undefined, Date.now())).toBe("Never");
  });
  it("says Today for same-day", () => {
    const now = Date.now();
    expect(daysAgoLabel(now - 1000, now)).toBe("Today");
  });
  it("singular for 1 day", () => {
    const now = Date.now();
    expect(daysAgoLabel(now - DAY_MS, now)).toBe("1 day ago");
  });
  it("plural for N days", () => {
    const now = Date.now();
    expect(daysAgoLabel(now - 5 * DAY_MS, now)).toBe("5 days ago");
  });
});

describe("lastSyncedLabel", () => {
  it("says never synced", () => {
    expect(lastSyncedLabel(undefined, Date.now())).toBe("Never synced");
  });
  it("says synced today", () => {
    const now = Date.now();
    expect(lastSyncedLabel(now, now)).toBe("Synced today");
  });
  it("pluralizes days", () => {
    const now = Date.now();
    expect(lastSyncedLabel(now - 3 * DAY_MS, now)).toBe("Synced 3 days ago");
  });
});

describe("isBackupStale", () => {
  const now = Date.now();
  it("false when there are no trips", () => {
    expect(isBackupStale(undefined, false, now)).toBe(false);
  });
  it("true when trips exist and never backed up", () => {
    expect(isBackupStale(undefined, true, now)).toBe(true);
  });
  it("false within 14 days", () => {
    expect(isBackupStale(now - 5 * DAY_MS, true, now)).toBe(false);
  });
  it("true after 14 days", () => {
    expect(isBackupStale(now - 15 * DAY_MS, true, now)).toBe(true);
  });
});

describe("formatBytes", () => {
  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats KB with no decimals", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });
  it("formats MB with one decimal", () => {
    expect(formatBytes(3.2 * 1024 * 1024)).toBe("3.2 MB");
  });
  it("falls back on invalid input", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("mergePreviewText", () => {
  it("describes adds and updates", () => {
    expect(
      mergePreviewText({ tripsAdded: 12, tripsUpdated: 3, routesAdded: 0, routesUpdated: 0 }),
    ).toBe("Adds 12 trips, updates 3 trips — nothing is deleted.");
  });
  it("describes no changes", () => {
    expect(
      mergePreviewText({ tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 }),
    ).toBe("No changes — this backup already matches what's on your device.");
  });
  it("combines trips and routes", () => {
    expect(
      mergePreviewText({ tripsAdded: 2, tripsUpdated: 0, routesAdded: 1, routesUpdated: 0 }),
    ).toBe("Adds 2 trips and 1 route — nothing is deleted.");
  });
  it("singularizes a single item", () => {
    expect(
      mergePreviewText({ tripsAdded: 1, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 }),
    ).toBe("Adds 1 trip — nothing is deleted.");
  });
});

// mergePreviewText is a forecast shown before the write; mergeResultText
// reports the same counts afterwards. Reusing the forecast as the receipt was
// the bug: "Import complete — Adds 12 trips… nothing is deleted."
describe("mergeResultText", () => {
  it("reports adds and updates in the past tense", () => {
    expect(
      mergeResultText({ tripsAdded: 12, tripsUpdated: 3, routesAdded: 2, routesUpdated: 0 }),
    ).toBe("added 12 trips and 2 routes, updated 3 trips");
  });
  it("singularizes a single item", () => {
    expect(
      mergeResultText({ tripsAdded: 1, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 }),
    ).toBe("added 1 trip");
  });
  it("names the no-op case generically by default", () => {
    expect(
      mergeResultText({ tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 }),
    ).toBe("nothing new to add");
  });
  it("lets the caller say where nothing came from", () => {
    expect(
      mergeResultText(
        { tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 },
        "nothing new from your other phone",
      ),
    ).toBe("nothing new from your other phone");
  });
  it("never mentions a backup, so the sync path can reuse it", () => {
    expect(
      mergeResultText({ tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0 }),
    ).not.toContain("backup");
  });
});

describe("generateSyncCode", () => {
  it("produces a readable grouped code", () => {
    const code = generateSyncCode();
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
  it("varies across calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSyncCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("isDateKeyString", () => {
  it("accepts a valid key", () => {
    expect(isDateKeyString("2026-08-07")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isDateKeyString("not-a-date")).toBe(false);
    expect(isDateKeyString(undefined)).toBe(false);
  });
});

describe("parseRateInput", () => {
  it("parses a valid rate", () => {
    expect(parseRateInput("0.7")).toBe(0.7);
  });
  it("rejects zero and negative", () => {
    expect(parseRateInput("0")).toBeNull();
    expect(parseRateInput("-1")).toBeNull();
  });
  it("rejects non-numeric", () => {
    expect(parseRateInput("abc")).toBeNull();
  });
});

describe("periodPreviewLabel", () => {
  it("null when unset", () => {
    expect(periodPreviewLabel(undefined, "2026-08-07")).toBeNull();
  });
  it("formats a weekly period", () => {
    const label = periodPreviewLabel({ frequency: "weekly", anchorKey: "2026-08-03" }, "2026-08-07");
    expect(label).toMatch(/Aug \d+ – Aug \d+/);
  });
});
