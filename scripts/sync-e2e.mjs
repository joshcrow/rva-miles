#!/usr/bin/env node
// End-to-end proof that two phones converge, with nobody tapping anything.
//
// Sync is the one feature that can lose a day's mileage, so it is tested
// against a real build talking to a real (in-memory) key-value store rather
// than a mocked fetch: scripts/mock-kv.mjs stands in for Vercel KV, `next
// start` serves the app with the same env vars the dashboard sets, and two
// isolated browser profiles play the two phones.
//
// Nothing in the run clicks "Sync now". Every transfer below is the automatic
// engine: a sync shortly after the app opens, and a sync 20 seconds after a
// local change settles.
//
//   node scripts/sync-e2e.mjs            # builds, then runs
//   SKIP_BUILD=1 node scripts/sync-e2e.mjs
//
// Note: the build is run with the sync env vars set, so ./.next afterwards is
// a KV-configured build. Re-run `npm run build` before shipping anything from
// that directory.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const APP_PORT = Number(process.env.E2E_PORT ?? 3210);
const KV_PORT = Number(process.env.E2E_KV_PORT ?? 3299);
const BASE = `http://127.0.0.1:${APP_PORT}`;
const KV_URL = `http://127.0.0.1:${KV_PORT}`;
const KV_TOKEN = "mock-token";
const CODE = "E2E7-SYNC9";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const SYNC_ENV = {
  ...process.env,
  UPSTASH_REDIS_REST_URL: KV_URL,
  UPSTASH_REDIS_REST_TOKEN: KV_TOKEN,
  MOCK_KV_TOKEN: KV_TOKEN,
};

const results = [];
const children = [];

function check(name, ok, detail) {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function start(command, args, env) {
  const child = spawn(command, args, { env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

function stopAll() {
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

async function waitFor(label, fn, timeoutMs = 30_000, everyMs = 500) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      last = err;
    }
    await sleep(everyMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

// --- the store, read the way the app's route reads it -----------------------

const KEY = `rva:${createHash("sha256").update(CODE).digest("hex")}`;

async function kvGet() {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["GET", KEY]),
  });
  const { result } = await res.json();
  return typeof result === "string" ? JSON.parse(result) : null;
}

// --- browser-side helpers ---------------------------------------------------

/** Dexie creates the database on first load; wait for its object stores. */
async function waitForDexie(page) {
  return page.evaluate(async () => {
    for (let i = 0; i < 80; i++) {
      const found = (await indexedDB.databases()).find((d) => d.name === "rva-miles");
      if (found) {
        const db = await new Promise((res) => {
          const r = indexedDB.open("rva-miles", found.version);
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(null);
        });
        if (db && db.objectStoreNames.contains("trips")) {
          db.close();
          return true;
        }
        if (db) db.close();
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  });
}

/** Writes straight into IndexedDB, so the seed itself never triggers a sync. */
async function seed(page, { trips = [], settings }) {
  return page.evaluate(
    async ({ trips, settings }) => {
      const pad = (n) => String(n).padStart(2, "0");
      const d = new Date();
      const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open("rva-miles");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      await new Promise((res, rej) => {
        const tx = db.transaction(["trips", "kv"], "readwrite");
        for (const t of trips) tx.objectStore("trips").put({ ...t, dateKey: today });
        tx.objectStore("kv").put({ key: "settings", value: settings });
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
      db.close();
      return today;
    },
    { trips, settings },
  );
}

async function readSettings(page) {
  return page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open("rva-miles");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const value = await new Promise((res, rej) => {
      const req = db.transaction("kv", "readonly").objectStore("kv").get("settings");
      req.onsuccess = () => res(req.result?.value ?? null);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return value;
  });
}

const RATE = 0.725;
const trip = (id, to, miles) => ({
  id,
  from: { name: "Home" },
  to: { name: to },
  distanceMiles: miles,
  purpose: "Client visit",
  ratePerMile: RATE,
  source: "tile",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const baseSettings = {
  ratePerMile: RATE,
  theme: "system",
  ownerName: "Dana Smith",
  syncCode: CODE,
};

// --- the run ----------------------------------------------------------------

async function main() {
  start(process.execPath, ["scripts/mock-kv.mjs", String(KV_PORT)], SYNC_ENV);
  await waitFor("mock-kv", async () => {
    const res = await fetch(KV_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", "warmup"]),
    });
    return res.ok;
  }, 15_000);
  check("mock KV store is up", true);

  if (!process.env.SKIP_BUILD) {
    console.log("building…");
    const code = await new Promise((res) => {
      const b = spawn("npx", ["next", "build"], { env: SYNC_ENV, stdio: "ignore" });
      b.on("exit", res);
    });
    if (code !== 0) throw new Error(`next build exited ${code}`);
  }

  start("npx", ["next", "start", "-p", String(APP_PORT)], SYNC_ENV);
  const health = await waitFor(
    "the app to report a configured sync store",
    async () => {
      const res = await fetch(`${BASE}/api/sync?health=1`);
      const data = await res.json();
      return data.configured === true;
    },
    60_000,
  );
  check("app sees the store through the env vars Vercel would set", health);

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const errors = [];

  // --- Phone A: two trips already logged, sync code set ---------------------
  const ctxA = await browser.newContext(phone);
  const a = await ctxA.newPage();
  a.on("pageerror", (e) => errors.push(`A ${e.message}`));
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  if (!(await waitForDexie(a))) throw new Error("phone A never created its database");
  await seed(a, {
    trips: [trip("e2e-clinic", "Chesterfield Clinic", 14.2), trip("e2e-office", "Short Pump Office", 22.6)],
    settings: baseSettings,
  });

  // Reopening the app is the trigger. Nothing is clicked.
  await a.reload({ waitUntil: "networkidle" });
  const pushed = await waitFor("phone A to push on its own", async () => {
    const snap = await kvGet();
    return snap && snap.trips.length === 2 ? snap : null;
  }, 45_000);
  check(
    "phone A pushed its trips automatically on open (no tap)",
    pushed.trips.map((t) => t.id).sort().join() === "e2e-clinic,e2e-office",
  );

  // --- Phone B: nothing but the same code -----------------------------------
  const ctxB = await browser.newContext(phone);
  const b = await ctxB.newPage();
  b.on("pageerror", (e) => errors.push(`B ${e.message}`));
  await b.goto(`${BASE}/`, { waitUntil: "networkidle" });
  if (!(await waitForDexie(b))) throw new Error("phone B never created its database");
  await seed(b, { trips: [], settings: baseSettings });
  await b.reload({ waitUntil: "networkidle" });

  await waitFor("phone B to finish its first sync", async () => {
    const s = await readSettings(b);
    return Boolean(s?.lastSyncAt);
  }, 45_000);

  await b.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  await b.waitForTimeout(1500);
  // Exact text, so the undo snackbar ("Deleted Short Pump Office trip") can
  // never be mistaken for a surviving ledger row.
  const rowB = (name) => b.getByText(name, { exact: true });
  check(
    "phone B pulled phone A's trips automatically",
    (await rowB("Chesterfield Clinic").count()) > 0 && (await rowB("Short Pump Office").count()) > 0,
  );

  // --- Delete on B, and watch the deletion travel ---------------------------
  await rowB("Short Pump Office").first().click();
  await b.getByRole("button", { name: "Delete trip" }).click();
  await b.waitForTimeout(1000);
  check("phone B removed the trip from its own ledger", (await rowB("Short Pump Office").count()) === 0);

  // 20-second quiet period after the last change, then the push. Nothing is
  // clicked here either — the wait IS the test.
  const tombstoned = await waitFor("the deletion to reach the store on its own", async () => {
    const snap = await kvGet();
    const row = snap?.trips.find((t) => t.id === "e2e-office");
    return row?.deletedAt ? snap : null;
  }, 60_000);
  check(
    "the deletion travelled to the store after the quiet period (no tap)",
    Boolean(tombstoned.trips.find((t) => t.id === "e2e-office").deletedAt),
  );

  // --- Back to A: the trip disappears ---------------------------------------
  const beforeA = (await readSettings(a))?.lastSyncAt ?? 0;
  await a.reload({ waitUntil: "networkidle" });
  await waitFor("phone A to sync again", async () => {
    const s = await readSettings(a);
    return s?.lastSyncAt && s.lastSyncAt > beforeA;
  }, 45_000);

  await a.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  await a.waitForTimeout(1500);
  const rowA = (name) => a.getByText(name, { exact: true });
  check("the deletion reached phone A — the trip is gone", (await rowA("Short Pump Office").count()) === 0);
  check("and the trip that was not deleted is still there", (await rowA("Chesterfield Clinic").count()) > 0);

  check("no page errors in either profile", errors.length === 0, errors.join(" | ") || undefined);

  await browser.close();
}

let failed = false;
try {
  await main();
} catch (err) {
  failed = true;
  results.push(`FAIL harness — ${err.message}`);
} finally {
  stopAll();
}

console.log(results.join("\n"));
const bad = failed || results.some((r) => r.startsWith("FAIL"));
console.log(bad ? "\nRESULT: FAIL" : "\nRESULT: PASS");
process.exit(bad ? 1 : 0);
