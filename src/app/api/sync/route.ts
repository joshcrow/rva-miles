// Optional cross-device sync: push/pull a full Snapshot keyed by a
// user-chosen "sync code". The code itself is never stored — only
// sha256(code) is used as the Redis key — and payloads are never logged.
// No env configured => {configured:false} everywhere, never a crash.

import { NextResponse, type NextRequest } from "next/server";
import type { Snapshot } from "@/types";

export const runtime = "edge";

const MAX_BYTES = 4 * 1024 * 1024;
const KEY_PREFIX = "rva:";

interface RedisCreds {
  url: string;
  token: string;
}

function credentials(): RedisCreds | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function keyFor(code: string): Promise<string> {
  return `${KEY_PREFIX}${await sha256Hex(code)}`;
}

/**
 * Single-command REST call (Upstash-compatible: works for both
 * UPSTASH_REDIS_REST_* and Vercel's KV_REST_API_* env pairs). The value
 * travels in the JSON body, never the URL, so it isn't size- or
 * log-exposed the way a query string would be.
 */
async function redisCommand(creds: RedisCreds, command: unknown[]): Promise<unknown> {
  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Sync store responded with ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

function isValidSnapshotShape(v: unknown): v is Snapshot {
  if (!v || typeof v !== "object") return false;
  const rec = v as Record<string, unknown>;
  return rec.schema === 2 && Array.isArray(rec.trips) && Array.isArray(rec.routes);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("health") === "1") {
    return NextResponse.json({ configured: credentials() !== null });
  }

  const creds = credentials();
  if (!creds) return NextResponse.json({ configured: false }, { status: 503 });

  const code = searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Missing sync code" }, { status: 400 });

  try {
    const key = await keyFor(code);
    const value = await redisCommand(creds, ["GET", key]);
    if (typeof value !== "string") {
      return NextResponse.json({ error: "No snapshot found for that code" }, { status: 404 });
    }
    return new NextResponse(value, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Deliberately no err/payload in this log path — never logs sync content.
    return NextResponse.json({ error: "Sync store is unavailable" }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const creds = credentials();
  if (!creds) return NextResponse.json({ configured: false }, { status: 503 });

  const code = searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Missing sync code" }, { status: 400 });

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Snapshot is too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON" }, { status: 400 });
  }
  if (!isValidSnapshotShape(parsed)) {
    return NextResponse.json({ error: "Body is not a valid snapshot" }, { status: 400 });
  }

  try {
    const key = await keyFor(code);
    await redisCommand(creds, ["SET", key, raw]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sync store is unavailable" }, { status: 502 });
  }
}
