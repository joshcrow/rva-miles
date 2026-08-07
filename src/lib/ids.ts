// Record ids. Every trip, route and drive gets one here so merge-by-id
// (backup import, cross-device sync) has a single collision domain.

/**
 * `crypto.randomUUID` is only defined in a secure context, which the app is
 * not when it's opened over plain http on a LAN address — a normal way to try
 * this on a phone. Falling back keeps a save from throwing there; ids only
 * need to be collision-free within one user's ledger, not unguessable.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
