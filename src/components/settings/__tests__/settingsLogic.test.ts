import { describe, expect, it } from "vitest";
import {
  daysAgoLabel,
  formatBytes,
  generateSyncCode,
  backupNudge,
  isDateKeyString,
  lastSyncedLabel,
  mergePreviewText,
  mergeResultText,
  parseRateInput,
  periodPreviewLabel,
  syncAgoLabel,
  syncStatusLine,
} from "../settingsLogic";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

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

describe("backupNudge", () => {
  const now = 1_700_000_000_000;

  it("stays silent with no trips", () => {
    expect(backupNudge(undefined, undefined, 0, now)).toBeNull();
  });

  it("stays silent for a young never-backed-up ledger", () => {
    expect(backupNudge(undefined, undefined, 3, now)).toBeNull();
  });

  it("speaks once a never-backed-up ledger has real data, naming the stakes", () => {
    expect(backupNudge(undefined, undefined, 12, now)).toBe("Your 12 trips exist only on this phone.");
  });

  it("stays silent when the last backup is recent", () => {
    expect(backupNudge(now - 5 * DAY_MS, undefined, 40, now)).toBeNull();
  });

  it("speaks when the last backup is over 30 days old", () => {
    expect(backupNudge(now - 31 * DAY_MS, undefined, 40, now)).toBe(
      "Trips logged since then exist only on this phone.",
    );
  });

  it("a recent sync suppresses the nudge — the data is not only on this phone", () => {
    expect(backupNudge(undefined, now - 2 * DAY_MS, 40, now)).toBeNull();
    expect(backupNudge(now - 60 * DAY_MS, now - 2 * DAY_MS, 40, now)).toBeNull();
  });

  // Sync now runs by itself, so a healthy phone stamps lastSyncAt every few
  // minutes. The nudge has to stay silent through all of that and speak again
  // the moment sync stops working for a week.
  it("stays silent while auto-sync is healthy", () => {
    expect(backupNudge(undefined, now - 2 * MINUTE_MS, 400, now)).toBeNull();
    expect(backupNudge(now - 90 * DAY_MS, now - 30_000, 400, now)).toBeNull();
  });

  it("speaks again once sync has been failing for over a week", () => {
    expect(backupNudge(undefined, now - 8 * DAY_MS, 40, now)).toBe(
      "Your 40 trips exist only on this phone.",
    );
  });
});

describe("syncAgoLabel", () => {
  const now = 1_700_000_000_000;

  it("says just now inside the first minute", () => {
    expect(syncAgoLabel(now - 5_000, now)).toBe("just now");
  });
  it("counts minutes", () => {
    expect(syncAgoLabel(now - 2 * MINUTE_MS, now)).toBe("2 min ago");
    expect(syncAgoLabel(now - 59 * MINUTE_MS, now)).toBe("59 min ago");
  });
  it("counts hours, singular and plural", () => {
    expect(syncAgoLabel(now - HOUR_MS, now)).toBe("1 hour ago");
    expect(syncAgoLabel(now - 5 * HOUR_MS, now)).toBe("5 hours ago");
  });
  it("says yesterday, then days", () => {
    expect(syncAgoLabel(now - DAY_MS, now)).toBe("yesterday");
    expect(syncAgoLabel(now - 4 * DAY_MS, now)).toBe("4 days ago");
  });
  it("never reads as the future when the clocks disagree", () => {
    expect(syncAgoLabel(now + 10_000, now)).toBe("just now");
  });
});

describe("syncStatusLine", () => {
  const now = 1_700_000_000_000;

  it("reports a healthy sync with how fresh it is", () => {
    expect(syncStatusLine("idle", now - 2 * MINUTE_MS, now)).toBe("Synced · 2 min ago");
  });
  it("says what it is doing while it works", () => {
    expect(syncStatusLine("syncing", now, now)).toBe("Syncing…");
  });
  it("names the offline case without alarm, and says what happens next", () => {
    expect(syncStatusLine("offline", now - HOUR_MS, now)).toBe(
      "Offline — will sync when you're back.",
    );
  });
  it("has an honest line before the first sync", () => {
    expect(syncStatusLine("idle", undefined, now)).toBe("Waiting to sync.");
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
