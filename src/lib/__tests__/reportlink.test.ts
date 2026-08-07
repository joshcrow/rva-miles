import { afterEach, describe, expect, it } from "vitest";
import type { ReportPayload } from "@/types";
import { decodeReport, encodeReport, reportUrl } from "../reportlink";

const payload: ReportPayload = {
  v: 1,
  title: "Pay Period Report",
  ownerName: "Dana Smith",
  vehicle: "Honda CR-V",
  range: { startKey: "2026-08-01", endKey: "2026-08-15" },
  generatedAt: 1_723_000_000_000,
  trips: [
    { dateKey: "2026-08-02", from: "Home", to: "Chesterfield Clinic", miles: 12.3, rate: 0.67, purpose: "Client visit" },
    { dateKey: "2026-08-05", from: "Home", to: "Supply Depot", miles: 5.1, rate: 0.67 },
  ],
};

const unicodePayload: ReportPayload = {
  v: 1,
  title: "Café Report — 日本語 🚗",
  range: { startKey: "2026-08-01", endKey: "2026-08-15" },
  generatedAt: 1_723_000_000_000,
  trips: [{ dateKey: "2026-08-02", from: "Café ☕", to: "日本橋", miles: 3.4, rate: 0.67, purpose: "路上视察 – 50% off" }],
};

// Temporarily removes CompressionStream/DecompressionStream to force the
// plain-base64url fallback path, even in a Node test runner where they exist.
async function withoutCompressionStreams<T>(fn: () => Promise<T>): Promise<T> {
  const originalCompression = globalThis.CompressionStream;
  const originalDecompression = globalThis.DecompressionStream;
  // @ts-expect-error -- intentionally deleting to simulate an unsupporting runtime
  delete globalThis.CompressionStream;
  // @ts-expect-error -- intentionally deleting to simulate an unsupporting runtime
  delete globalThis.DecompressionStream;
  try {
    return await fn();
  } finally {
    globalThis.CompressionStream = originalCompression;
    globalThis.DecompressionStream = originalDecompression;
  }
}

describe("encodeReport / decodeReport", () => {
  it("uses the gzip path ('1.' prefix) when CompressionStream is available and round-trips exactly", async () => {
    expect(typeof CompressionStream).toBe("function"); // sanity: Node test env has it
    const encoded = await encodeReport(payload);
    expect(encoded.startsWith("1.")).toBe(true);
    expect(encoded.slice(2)).not.toMatch(/[+/=]/); // URL-safe alphabet only

    const decoded = await decodeReport(encoded);
    expect(decoded).toEqual(payload);
  });

  it("falls back to the plain path ('0.' prefix) when CompressionStream is unavailable and still round-trips", async () => {
    const encoded = await withoutCompressionStreams(() => encodeReport(payload));
    expect(encoded.startsWith("0.")).toBe(true);
    expect(encoded.slice(2)).not.toMatch(/[+/=]/);

    const decoded = await decodeReport(encoded);
    expect(decoded).toEqual(payload);
  });

  it("round-trips unicode payloads through the gzip path", async () => {
    const encoded = await encodeReport(unicodePayload);
    expect(encoded.startsWith("1.")).toBe(true);
    const decoded = await decodeReport(encoded);
    expect(decoded).toEqual(unicodePayload);
    expect(decoded.title).toBe("Café Report — 日本語 🚗");
  });

  it("round-trips unicode payloads through the plain fallback path", async () => {
    const encoded = await withoutCompressionStreams(() => encodeReport(unicodePayload));
    expect(encoded.startsWith("0.")).toBe(true);
    const decoded = await decodeReport(encoded);
    expect(decoded).toEqual(unicodePayload);
  });

  it("produces a shorter gzip encoding than the plain encoding for a repetitive payload", async () => {
    const bigPayload: ReportPayload = {
      ...payload,
      trips: Array.from({ length: 30 }, (_, i) => ({
        dateKey: "2026-08-02",
        from: "Home Office",
        to: "Chesterfield Regional Clinic",
        miles: 12.3,
        rate: 0.67,
        purpose: `Client visit ${i}`,
      })),
    };
    const gzipEncoded = await encodeReport(bigPayload);
    const plainEncoded = await withoutCompressionStreams(() => encodeReport(bigPayload));
    expect(gzipEncoded.length).toBeLessThan(plainEncoded.length);
  });

  it("rejects a fragment with an unrecognized prefix", async () => {
    await expect(decodeReport("9.garbage")).rejects.toThrow();
  });

  it("rejects a corrupted base64 body", async () => {
    await expect(decodeReport("0.not-valid-base64url-!!!")).rejects.toThrow();
  });

  it("rejects a well-formed but structurally invalid payload", async () => {
    const encoded = await withoutCompressionStreams(() =>
      encodeReport({ nope: true } as unknown as ReportPayload)
    );
    await expect(decodeReport(encoded)).rejects.toThrow();
  });
});

describe("reportUrl", () => {
  it("builds an origin + /r#<encoded fragment> URL that decodes back to the payload", async () => {
    const url = await reportUrl("https://rva-miles.example", payload);
    expect(url.startsWith("https://rva-miles.example/r#")).toBe(true);
    const fragment = url.split("#")[1];
    const decoded = await decodeReport(fragment);
    expect(decoded).toEqual(payload);
  });
});

afterEach(() => {
  // Guard against any test leaving the globals deleted if withoutCompressionStreams threw unexpectedly.
  expect(typeof globalThis.CompressionStream).toBe("function");
});
