"use client";

// Clipboard with a legacy fallback. navigator.clipboard is unavailable on
// non-secure origins and in some in-app browsers (the manager may well open
// the report link inside a mail client's webview), so a failure there falls
// back to the old selection trick before giving up. Throws when nothing
// worked — callers surface that loudly.

import { UserFacingError } from "@/lib/errors";

export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the legacy path
    }
  }

  if (typeof document === "undefined") {
    throw new UserFacingError("Copying isn't available here.");
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    if (!ok) throw new UserFacingError("Your browser blocked the copy. Select the text and copy it manually.");
  } finally {
    document.body.removeChild(area);
  }
}
