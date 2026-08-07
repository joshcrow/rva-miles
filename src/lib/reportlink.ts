// Report-as-a-link: the whole payload lives in the URL fragment, gzip'd when
// the runtime supports streams compression, base64url-encoded either way.
// Nothing ever touches a server. Prefix byte tells decodeReport which path
// was used ('1.' = gzip, '0.' = plain) so old links keep working forever.

import type { ReportPayload } from "@/types";

const GZIP_PREFIX = "1.";
const PLAIN_PREFIX = "0.";

// TS 5.7+ makes typed arrays generic over their backing buffer; the bare
// `Uint8Array` annotation widens to `Uint8Array<ArrayBufferLike>`, which
// BlobPart/Response rejects. Pin to the ArrayBuffer-backed form everywhere.
type Bytes = Uint8Array<ArrayBuffer>;

function hasCompressionStreams(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

function bytesToBase64Url(bytes: Bytes): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Bytes {
  let base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes: Bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gzip(bytes: Bytes): Promise<Bytes> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Bytes): Promise<Bytes> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeReport(p: ReportPayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(p));

  if (hasCompressionStreams()) {
    const compressed = await gzip(bytes);
    return GZIP_PREFIX + bytesToBase64Url(compressed);
  }

  return PLAIN_PREFIX + bytesToBase64Url(bytes);
}

function isReportPayload(v: unknown): v is ReportPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return p.v === 1 && typeof p.title === "string" && Array.isArray(p.trips) && typeof p.range === "object";
}

export async function decodeReport(fragment: string): Promise<ReportPayload> {
  const prefix = fragment.slice(0, 2);
  const body = fragment.slice(2);
  if (prefix !== GZIP_PREFIX && prefix !== PLAIN_PREFIX) {
    throw new Error("This report link isn't recognized. It may be from a newer or incompatible version of the app.");
  }

  let bytes: Bytes;
  try {
    bytes = base64UrlToBytes(body);
  } catch {
    throw new Error("This report link is corrupted and can't be read.");
  }

  const raw = prefix === GZIP_PREFIX ? await gunzip(bytes) : bytes;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new Error("This report link is corrupted and can't be read.");
  }

  if (!isReportPayload(parsed)) {
    throw new Error("This report link is missing expected data and can't be read.");
  }

  return parsed;
}

export async function reportUrl(origin: string, p: ReportPayload): Promise<string> {
  const encoded = await encodeReport(p);
  return `${origin}/r#${encoded}`;
}
