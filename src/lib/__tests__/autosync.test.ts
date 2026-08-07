// The auto-sync scheduler. The trigger wiring itself needs a browser, but the
// decision it exists to make — "has the ledger sat still long enough, and have
// we held this change too long already?" — is pure, so it is tested with a
// hand-cranked clock rather than fake timers.

import { describe, expect, it } from "vitest";
import { createDebouncedScheduler, MAX_WAIT_MS, QUIET_PERIOD_MS } from "../autosync";

function clock(start = 1_700_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advance(ms: number) {
      t += ms;
      return t;
    },
  };
}

const DELAY = 20_000;
const MAX = 120_000;

describe("createDebouncedScheduler", () => {
  it("has nothing to say before the first write", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);

    expect(s.pending()).toBe(false);
    expect(s.dueAt()).toBeNull();
    expect(s.takeIfDue()).toBe(false);
  });

  it("schedules one write for the end of the quiet period", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);

    const due = s.request();

    expect(due).toBe(c.now() + DELAY);
    expect(s.pending()).toBe(true);
    expect(s.dueAt()).toBe(due);
  });

  it("holds until the quiet period is actually up", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    s.request();

    c.advance(DELAY - 1);
    expect(s.takeIfDue()).toBe(false);
    expect(s.pending()).toBe(true);

    c.advance(1);
    expect(s.takeIfDue()).toBe(true);
    expect(s.pending()).toBe(false);
  });

  it("pushes the flush out with every further write", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    s.request();

    c.advance(5_000);
    const due = s.request();

    expect(due).toBe(c.now() + DELAY);

    // The original due time passes without a flush: the user is still typing.
    c.advance(DELAY - 5_000);
    expect(s.takeIfDue()).toBe(false);

    c.advance(5_000);
    expect(s.takeIfDue()).toBe(true);
  });

  it("never holds the first write of a burst past the ceiling", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    const first = c.now();
    s.request();

    // A change every five seconds forever would otherwise defer the flush
    // forever — a whole afternoon of edits with nothing on the other phone.
    for (let elapsed = 0; elapsed < MAX; elapsed += 5_000) {
      c.advance(5_000);
      s.request();
      expect(s.dueAt()).toBeLessThanOrEqual(first + MAX);
    }

    expect(s.takeIfDue()).toBe(true);
  });

  it("flushes exactly at the ceiling when writes never stop", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    const first = c.now();
    s.request();

    c.advance(MAX - 1);
    s.request();
    expect(s.dueAt()).toBe(first + MAX);
    expect(s.takeIfDue()).toBe(false);

    c.advance(1);
    expect(s.takeIfDue()).toBe(true);
  });

  it("forgets a pending flush when the caller runs one itself", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    s.request();

    s.clear();

    expect(s.pending()).toBe(false);
    expect(s.dueAt()).toBeNull();
    c.advance(DELAY * 10);
    expect(s.takeIfDue()).toBe(false);
  });

  it("starts a fresh burst after a flush", () => {
    const c = clock();
    const s = createDebouncedScheduler(DELAY, MAX, c.now);
    s.request();
    c.advance(DELAY);
    expect(s.takeIfDue()).toBe(true);

    const due = s.request();
    expect(due).toBe(c.now() + DELAY);
  });
});

describe("the shipped timings", () => {
  // These two numbers are the whole felt behaviour of auto-sync: how long
  // after a trip is logged the other phone can see it, and the worst case
  // during a long catch-up session.
  it("waits 20 seconds after the last change and at most 2 minutes", () => {
    expect(QUIET_PERIOD_MS).toBe(20_000);
    expect(MAX_WAIT_MS).toBe(120_000);
  });
});
