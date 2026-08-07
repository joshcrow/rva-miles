// Native share / download / mailto glue. Web Share API support (especially
// with files) is inconsistent across browsers, so every entry point here is
// feature-detected and fails soft to a boolean the caller uses to fall back
// to a plain download — never throws for "unsupported".

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  // canShare() itself is newer than share() in some browsers — assume ok and let shareFiles() catch failure if it's missing.
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

export interface ShareMeta {
  title?: string;
  text?: string;
}

/** Returns false when the caller should fall back to downloadBlob(). User-cancelled shares count as handled (true), not a failure. */
export async function shareFiles(files: File[], meta: ShareMeta = {}): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    await navigator.share({ files, title: meta.title, text: meta.text });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("Downloads are only available in the browser.");
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Deferred so Safari has time to hand the blob URL off to the download before it's revoked.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export interface MailtoParams {
  to?: string;
  subject?: string;
  body?: string;
}

export function mailtoUrl({ to = "", subject, body }: MailtoParams): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return `mailto:${encodeURIComponent(to)}${query}`;
}
