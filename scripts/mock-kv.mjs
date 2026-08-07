#!/usr/bin/env node
// A stand-in for the Upstash/Vercel KV REST API, for testing sync locally
// without attaching a real store. It implements exactly the surface
// src/app/api/sync/route.ts uses and nothing else: a POST carrying a
// single command array, Bearer auth, and the two commands GET and SET,
// backed by an in-memory Map that dies with the process.
//
//   node scripts/mock-kv.mjs [port]
//   UPSTASH_REDIS_REST_URL=http://127.0.0.1:3299 \
//   UPSTASH_REDIS_REST_TOKEN=mock-token npm start
//
// Not a Redis, and not safe for anything but a test: no persistence, no TTL,
// no auth worth the name.

import { createServer } from "node:http";

const PORT = Number(process.argv[2] ?? process.env.MOCK_KV_PORT ?? 3299);
const TOKEN = process.env.MOCK_KV_TOKEN ?? "mock-token";

const store = new Map();

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function handle(command, res) {
  const [name, key, value] = command;
  switch (String(name).toUpperCase()) {
    case "GET":
      // Upstash answers a missing key with null, which the route reads as
      // "no snapshot for that code" and turns into its 404.
      return send(res, 200, { result: store.has(key) ? store.get(key) : null });
    case "SET":
      store.set(key, String(value));
      return send(res, 200, { result: "OK" });
    default:
      return send(res, 400, { error: `mock-kv does not implement ${name}` });
  }
}

const server = createServer((req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "mock-kv only answers POST" });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(res, 401, { error: "Unauthorized" });
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let command;
    try {
      command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return send(res, 400, { error: "Body is not valid JSON" });
    }
    if (!Array.isArray(command) || command.length === 0) {
      return send(res, 400, { error: "Body is not a command array" });
    }
    handle(command, res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  // The E2E script waits for this line before starting the app.
  console.log(`mock-kv listening on http://127.0.0.1:${PORT}`);
});
