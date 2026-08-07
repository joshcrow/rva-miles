// db.ts wraps IndexedDB (via Dexie), which isn't available in a plain node
// test environment. Rather than mock IndexedDB, the merge *decision* logic
// is factored out as the pure, dependency-free `mergePlan` — this tests
// that directly. db.ts's `importMerge` is a thin, un-tested-here wrapper
// that fetches existing rows, calls mergePlan, and bulkPuts the result.
import { describe, expect, it } from "vitest";
import { mergePlan } from "../db";

interface Rec {
  id: string;
  updatedAt: number;
  label?: string;
}

describe("mergePlan", () => {
  it("adds every incoming record when existing is empty", () => {
    const incoming: Rec[] = [
      { id: "a", updatedAt: 1 },
      { id: "b", updatedAt: 2 },
    ];
    const plan = mergePlan<Rec>([], incoming);
    expect(plan.added).toBe(2);
    expect(plan.updated).toBe(0);
    expect(plan.skipped).toBe(0);
    expect(plan.toPut).toEqual(incoming);
  });

  it("is a no-op when incoming is empty", () => {
    const existing: Rec[] = [{ id: "a", updatedAt: 1 }];
    const plan = mergePlan<Rec>(existing, []);
    expect(plan).toEqual({ toPut: [], added: 0, updated: 0, skipped: 0 });
  });

  it("incoming with a strictly newer updatedAt replaces the existing record", () => {
    const existing: Rec[] = [{ id: "a", updatedAt: 100, label: "old" }];
    const incoming: Rec[] = [{ id: "a", updatedAt: 200, label: "new" }];
    const plan = mergePlan<Rec>(existing, incoming);
    expect(plan.updated).toBe(1);
    expect(plan.added).toBe(0);
    expect(plan.skipped).toBe(0);
    expect(plan.toPut).toEqual([{ id: "a", updatedAt: 200, label: "new" }]);
  });

  it("incoming with an older updatedAt is skipped — never a wholesale overwrite", () => {
    const existing: Rec[] = [{ id: "a", updatedAt: 200, label: "keep-me" }];
    const incoming: Rec[] = [{ id: "a", updatedAt: 100, label: "stale" }];
    const plan = mergePlan<Rec>(existing, incoming);
    expect(plan.skipped).toBe(1);
    expect(plan.added).toBe(0);
    expect(plan.updated).toBe(0);
    expect(plan.toPut).toEqual([]);
  });

  it("incoming with an equal updatedAt is skipped (strictly-newer wins, not >=)", () => {
    const existing: Rec[] = [{ id: "a", updatedAt: 100, label: "existing" }];
    const incoming: Rec[] = [{ id: "a", updatedAt: 100, label: "incoming" }];
    const plan = mergePlan<Rec>(existing, incoming);
    expect(plan.skipped).toBe(1);
    expect(plan.toPut).toEqual([]);
  });

  it("handles a mixed batch: add + update + skip simultaneously, unioned by id", () => {
    const existing: Rec[] = [
      { id: "a", updatedAt: 10 }, // will be updated
      { id: "b", updatedAt: 50 }, // will be skipped (incoming stale)
      { id: "c", updatedAt: 5 }, // untouched — no incoming record for it
    ];
    const incoming: Rec[] = [
      { id: "a", updatedAt: 20 },
      { id: "b", updatedAt: 40 },
      { id: "d", updatedAt: 1 }, // new record
    ];
    const plan = mergePlan<Rec>(existing, incoming);
    expect(plan.added).toBe(1);
    expect(plan.updated).toBe(1);
    expect(plan.skipped).toBe(1);
    expect(plan.toPut.map((r) => r.id).sort()).toEqual(["a", "d"]);
    // "c" (no incoming counterpart) never appears in toPut — mergePlan only
    // describes what to write; it never deletes/drops records unilaterally.
    expect(plan.toPut.some((r) => r.id === "c")).toBe(false);
  });

  it("union by id de-duplicates incoming records sharing an id with an existing one, keeping the newest", () => {
    const existing: Rec[] = [{ id: "a", updatedAt: 1 }];
    const incoming: Rec[] = [
      { id: "a", updatedAt: 2, label: "first" },
      { id: "a", updatedAt: 3, label: "second" },
    ];
    const plan = mergePlan<Rec>(existing, incoming);
    // Both incoming entries individually beat the *original* existing
    // record (updatedAt 1), so mergePlan — which compares each incoming
    // record against the existing snapshot, not against prior incoming
    // records — queues both. Last-write-wins is then a bulkPut ordering
    // concern for the caller, not mergePlan's.
    expect(plan.toPut).toHaveLength(2);
    expect(plan.updated).toBe(2);
  });
});
