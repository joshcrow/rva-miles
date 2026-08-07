/**
 * An Error whose `message` was written for the user, not for a developer.
 *
 * Ordinary throws are diagnostics: `db.ts` says `importMerge: trip "0f3b…" has
 * invalid dateKey`, Dexie says whatever Dexie says. None of that may ever land
 * in a red snackbar, so `uiActions.showError` renders the caller's written
 * fallback and sends the raw error to the console instead. Copy that genuinely
 * belongs on screen but has to travel as a throw — a geolocation refusal, a
 * report link that arrived truncated — is marked with this class and shown
 * verbatim.
 *
 * Lives here rather than in the ui store so pure libs can throw it without
 * pulling a React state container into their import graph.
 */
export class UserFacingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UserFacingError";
  }
}

/** True for copy that was written to be read by the person on the other side. */
export function isUserFacing(err: unknown): err is UserFacingError {
  return err instanceof UserFacingError;
}
