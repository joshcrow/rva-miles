"use client";

import { useEffect } from "react";

/**
 * Registers the hand-written service worker (public/sw.js). Production only —
 * a cached app shell in dev makes Turbopack HMR lie about what's on screen.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Offline support is a progressive enhancement: failing to register
        // never blocks the ledger, so this one stays off the snackbar.
        console.warn("[rva-miles] service worker registration failed", err);
      });
    };

    if (document.readyState === "complete") {
      register();
      return () => {
        cancelled = true;
      };
    }
    window.addEventListener("load", register);
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

export default ServiceWorkerRegistrar;
