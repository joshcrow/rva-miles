// The sync engine with the network and the database stubbed out. db.ts is
// mocked around the *real* validateSnapshot, because "what the server sent is
// refused" is the guarantee most worth proving with the actual validator.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MergeResult, Settings, Snapshot, Trip } from "@/types";

const env = vi.hoisted(() => ({
  demo: false,
  settings: { ratePerMile: 0.725, theme: "system" } as Settings,
  local: null as Snapshot | null,
  merged: {
    tripsAdded: 0,
    tripsUpdated: 0,
    routesAdded: 0,
    routesUpdated: 0,
    skipped: 0,
  } as MergeResult,
  imports: [] as Snapshot[],
  saves: [] as Settings[],
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isDemoMode: () => env.demo,
    getSettings: async () => ({ ...env.settings }),
    saveSettings: async (s: Settings) => {
      env.settings = s;
      env.saves.push(s);
    },
    exportSnapshot: async () => env.local,
    importMerge: async (s: Snapshot) => {
      env.imports.push(s);
      return env.merged;
    },
  };
});

import {
  getSyncState,
  isSyncConfigured,
  isSyncEnabled,
  knownSyncConfigured,
  resetSyncEngine,
  syncNow,
} from "../sync";

const CODE = "AAAA-BBBB";

function trip(id: string, updatedAt: number): Trip {
  return {
    id,
    dateKey: "2026-08-07",
    from: { name: "Home" },
    to: { name: "Chesterfield Clinic" },
    distanceMiles: 14.2,
    ratePerMile: 0.725,
    source: "tile",
    createdAt: updatedAt,
    updatedAt,
  };
}

function snapshot(trips: Trip[]): Snapshot {
  return { schema: 2, exportedAt: 1_700_000_000_000, trips, routes: [] };
}

interface StubResponse {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
}

function res(status: number, body: unknown): StubResponse {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

type Handler = (url: string, init?: RequestInit) => StubResponse | Promise<StubResponse>;

function installFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The ordinary deployment: a store is attached and answers both calls. */
function healthyServer(remote: Snapshot | null): Handler {
  return (url, init) => {
    if (url.includes("health=1")) return res(200, { configured: true });
    if (init?.method === "PUT") return res(200, { ok: true });
    return remote ? res(200, remote) : res(404, { error: "No snapshot found for that code" });
  };
}

beforeEach(() => {
  resetSyncEngine();
  env.demo = false;
  env.settings = { ratePerMile: 0.725, theme: "system", syncCode: CODE };
  env.local = snapshot([trip("local-1", 20)]);
  env.merged = { tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0, skipped: 0 };
  env.imports = [];
  env.saves = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncNow — the happy cycle", () => {
  it("merges what the server holds, pushes the union back, and stamps the time", async () => {
    env.merged = { tripsAdded: 1, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0, skipped: 1 };
    const remote = snapshot([trip("remote-1", 30)]);
    const fetchFn = installFetch(healthyServer(remote));

    const before = Date.now();
    const result = await syncNow();

    expect(result).toEqual({ ok: true, merged: env.merged });
    expect(env.imports).toEqual([remote]);

    const put = fetchFn.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(put).toBeDefined();
    expect(String(put?.[0])).toContain(`code=${CODE}`);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual(env.local);

    const state = getSyncState();
    expect(state.status).toBe("idle");
    expect(state.lastSyncAt).toBeGreaterThanOrEqual(before);
    expect(env.settings.lastSyncAt).toBe(state.lastSyncAt);
  });

  it("keeps the rest of settings intact when it stamps the time", async () => {
    env.settings = { ratePerMile: 0.725, theme: "dark", syncCode: CODE, ownerName: "Dana Smith" };
    installFetch(healthyServer(null));

    await syncNow();

    expect(env.settings.ownerName).toBe("Dana Smith");
    expect(env.settings.theme).toBe("dark");
    expect(env.settings.syncCode).toBe(CODE);
  });
});

describe("syncNow — first sync for a code", () => {
  it("treats 404 as an empty server and pushes without merging anything", async () => {
    const fetchFn = installFetch(healthyServer(null));

    const result = await syncNow();

    expect(result).toEqual({
      ok: true,
      merged: { tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0, skipped: 0 },
    });
    expect(env.imports).toEqual([]);
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true);
    expect(getSyncState().status).toBe("idle");
  });
});

describe("syncNow — a server payload that can't be trusted", () => {
  it("writes nothing locally and never pushes on top of it", async () => {
    const fetchFn = installFetch((url, init) => {
      if (url.includes("health=1")) return res(200, { configured: true });
      if (init?.method === "PUT") return res(200, { ok: true });
      return res(200, { schema: 3, trips: [], routes: [] });
    });

    const result = await syncNow();

    expect(result.ok).toBe(false);
    expect(env.imports).toEqual([]);
    expect(env.saves).toEqual([]);
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);

    const state = getSyncState();
    expect(state.status).toBe("error");
    expect(state.lastError).toBe(
      "Couldn't read what your other phone sent. Nothing here was changed.",
    );
  });

  it("refuses a snapshot carrying a trip with no usable date", async () => {
    const bad = { schema: 2, exportedAt: 1, trips: [{ ...trip("x", 1), dateKey: "nope" }], routes: [] };
    installFetch((url, init) => {
      if (url.includes("health=1")) return res(200, { configured: true });
      if (init?.method === "PUT") return res(200, { ok: true });
      return res(200, bad);
    });

    expect((await syncNow()).ok).toBe(false);
    expect(env.imports).toEqual([]);
  });

  it("reports a server that answers with an error status as unreachable", async () => {
    installFetch((url) => {
      if (url.includes("health=1")) return res(200, { configured: true });
      return res(502, { error: "Sync store is unavailable" });
    });

    expect((await syncNow()).ok).toBe(false);
    expect(getSyncState().lastError).toBe(
      "Couldn't reach the sync server. Nothing was lost — your trips are safe on this phone.",
    );
  });
});

describe("syncNow — no network", () => {
  it("goes offline rather than red, and leaves the ledger alone", async () => {
    installFetch((url) => {
      if (url.includes("health=1")) return res(200, { configured: true });
      throw new TypeError("Failed to fetch");
    });

    const result = await syncNow();

    expect(result).toEqual({ ok: false, reason: "offline" });
    expect(env.saves).toEqual([]);
    expect(getSyncState().status).toBe("offline");
    expect(getSyncState().lastError).toBeUndefined();
  });

  it("keeps showing the last successful time while offline", async () => {
    installFetch(healthyServer(null));
    await syncNow();
    const good = getSyncState().lastSyncAt;

    installFetch((url) => {
      if (url.includes("health=1")) return res(200, { configured: true });
      throw new TypeError("Failed to fetch");
    });
    await syncNow();

    expect(getSyncState().status).toBe("offline");
    expect(getSyncState().lastSyncAt).toBe(good);
  });
});

describe("syncNow — single flight", () => {
  it("coalesces concurrent calls into one round trip", async () => {
    const fetchFn = installFetch(healthyServer(null));

    const [a, b, c] = await Promise.all([syncNow(), syncNow(), syncNow()]);

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
  });

  it("lets a later call start a fresh cycle", async () => {
    const fetchFn = installFetch(healthyServer(null));

    await syncNow();
    await syncNow();

    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(2);
  });
});

describe("syncNow — the guards", () => {
  it("never touches the network on a demo ledger", async () => {
    env.demo = true;
    const fetchFn = installFetch(healthyServer(null));

    expect(await syncNow()).toEqual({ ok: false, reason: "demo mode" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(getSyncState().status).toBe("idle");
  });

  it("does nothing without a sync code", async () => {
    env.settings = { ratePerMile: 0.725, theme: "system" };
    const fetchFn = installFetch(healthyServer(null));

    expect(await syncNow()).toEqual({ ok: false, reason: "no sync code" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("treats a blank code as no code", async () => {
    env.settings = { ratePerMile: 0.725, theme: "system", syncCode: "   " };
    const fetchFn = installFetch(healthyServer(null));

    expect((await syncNow()).ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("stops after the health check when no store is attached", async () => {
    const fetchFn = installFetch(() => res(200, { configured: false }));

    expect(await syncNow()).toEqual({ ok: false, reason: "server not configured" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getSyncState().status).toBe("idle");
  });
});

describe("isSyncConfigured", () => {
  it("remembers a real answer for the session", async () => {
    const fetchFn = installFetch(() => res(200, { configured: true }));

    expect(await isSyncConfigured()).toBe(true);
    expect(await isSyncConfigured()).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(knownSyncConfigured()).toBe(true);
  });

  it("does not remember a failed probe", async () => {
    let attempt = 0;
    installFetch(() => {
      attempt++;
      if (attempt === 1) throw new TypeError("Failed to fetch");
      return res(200, { configured: true });
    });

    expect(await isSyncConfigured()).toBe(false);
    expect(knownSyncConfigured()).toBeNull();
    expect(await isSyncConfigured()).toBe(true);
  });

  it("shares one probe between concurrent callers", async () => {
    const fetchFn = installFetch(() => res(200, { configured: true }));

    await Promise.all([isSyncConfigured(), isSyncConfigured(), isSyncConfigured()]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("isSyncEnabled", () => {
  it("is true only with a real ledger, a code and a store", async () => {
    installFetch(() => res(200, { configured: true }));
    expect(await isSyncEnabled()).toBe(true);
  });

  it("is false in demo mode", async () => {
    env.demo = true;
    installFetch(() => res(200, { configured: true }));
    expect(await isSyncEnabled()).toBe(false);
  });

  it("is false without a code", async () => {
    env.settings = { ratePerMile: 0.725, theme: "system" };
    installFetch(() => res(200, { configured: true }));
    expect(await isSyncEnabled()).toBe(false);
  });

  it("is false when the deployment has no store", async () => {
    installFetch(() => res(200, { configured: false }));
    expect(await isSyncEnabled()).toBe(false);
  });
});
