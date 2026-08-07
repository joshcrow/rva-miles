# RVA Miles — content style

The copy system for every user-visible string. One rule per line. If a string
breaks a rule, the string is wrong.

Two readers. **The driver** logs work drives on a phone, often parked, often in
a hurry. **Her manager** opens `/r` and the files it produces, has never seen
the app, and will never open it again. Everything that leaves the app is
written for him.

Voice: calm, precise, quietly confident. Plain words over clever ones. Never
scold, never hedge, no exclamation points. A little warmth is allowed in empty
states and zero-stakes moments; around money, data loss and errors the copy is
strictly factual.

---

## Term ledger

| Term | Means | Never |
| --- | --- | --- |
| **trip** | A saved ledger record. Logged, edited, repeated, deleted, counted, exported. | "drive", "journey", "entry" |
| **drive** | The live GPS act. Started, tracked, resumed, discarded, finished. Finishing a drive produces a trip. | "trip" while it is still live |
| **route** | A remembered origin → destination pair. Saved, edited, archived, restored, counted. | "tile" in any string a control acts on |
| **tile** | Prose only, for how a route looks on Home ("it turns into a one-tap tile"). | the object of a verb |
| **stop** | A point on a multi-stop trip. | a span |
| **leg** | The span between two stops. A section listing legs is headed "Legs". | "stop" |
| **billed / not billed** | The money state of a leg or a distance. | "billable" (code word) |
| **report** | The pay-period document sent to a manager. | "export" |
| **backup** | The whole-ledger JSON file. | "export", "snapshot" |
| **download** | The verb for taking a file. | "export" |
| **pay period** | The unit, on every surface that names it. | "period" alone in a preset or chip |
| **Driver** | The person the report is about, on every artifact. | "Owner" |
| **sync code** | The code typed on both phones. A product noun, kept deliberately. | — |

Code-only words that must never surface: `payload`, `snapshot`, `segment`,
`journey`, `merge`, `billable`, `JSON`, `localStorage`, `routing service`,
`snackbar`, `in-progress row`, `schema`.

## Verbs

- **Log** commits a trip from Home, Trips or catch-up. Instant, undoable.
- **Save** commits a form with fields (Save trip, Save route, Save changes).
- A confirmation that a trip is now in the ledger always starts "Logged", whatever surface produced it.
- **Back up** produces a backup. **Import** reads one. **Sync** reconciles two devices.
- **Archive** retires a route. **Delete** removes a trip from the ledger. **Discard** throws away a drive that was never saved.
- Undo is always labelled "Undo".

## Numbers, money, dates

- Miles print at one decimal on every surface, including GPS-captured trips.
- Any sentence stating a relationship between miles, rate and amount must be true of the printed figures.
- `mi` immediately after a numeral, with a space: "14.2 mi". Never a standalone column header.
- "Miles" spelled out and capitalised as a standalone column, field or stat label.
- "miles" spelled out inside aria-labels, email bodies and share text.
- Money: one formatter. "$150.22", thousands-grouped. Rates keep a half cent ("$0.725") and carry "/mi" wherever shown as a unit price.
- Dates: "Aug 3" inside the app; "Aug 3, 2026" on anything that leaves it; ISO "YYYY-MM-DD" inside CSV cells only, because Excel parses month names differently by locale. That split is deliberate — do not "fix" it.
- Ranges use an en dash: "Aug 1 – 15, 2026".

## Punctuation

- Button labels take no terminal period.
- Success and confirmation snackbars are fragments: "Trip removed", "Backup saved". No period.
- Error snackbars are sentences: "Couldn't save that trip." Period.
- Helper text takes a period when it is a complete statement or an instruction ("Enter a distance greater than 0."), and none when it is a bare noun or participial phrase ("Shown on reports", "Remembered for next time") or a label:value pair ("Current default: $0.725/mi").
- Em dash joins a headline to its identifier: "Logged 14.2 mi — Chesterfield Clinic", "Logged 14.2 mi — Aug 3".
- Middle dot joins peer facts of equal weight: "214.6 mi · $150.22".
- En dash only for date ranges. Never a bullet "•". Never two em dashes in one string.
- Real ellipsis character in every progress label: "Saving…", "Finding GPS…".
- Straight ASCII apostrophes — they survive mailto, CSV and the clipboard intact.

## Case

- Sentence case for every label, button, header, chip and section title.
- Two exceptions: strings quoted verbatim from an operating system ("Add to Home Screen", "Location Services"), and the driving cockpit's deliberate display type (START, STOP, SAVING).
- "Home", "Trips", "Report" and "Settings" are capitalised when naming a screen, including inside aria-labels.
- "Mileage Report" keeps title case: it is the name of a document, not a UI label.

## Errors

- An error says three things in order: what happened, what it means for her data or money, what to do. "Couldn't save this trip. Nothing was lost — try again." is the reference.
- If a message cannot say what it means for her, it is not finished.
- A message thrown by a lib is a diagnostic, not copy. `throw new Error(...)` in `db.ts` and friends is written for a developer and goes to the console.
- The snackbar renders the caller's written fallback, never a raw `Error.message`. `showError(err, "…")` logs `err` and shows the sentence.
- The one exception is `UserFacingError` (`src/stores/ui.ts`): copy written deliberately for the user that happens to travel as a throw. Nothing else may reach a snackbar.
- Inline Alert actions are "Retry". Full-screen recovery buttons are "Try again". Keep the split; never mix them within one surface.
- No hedges around money or data: no "silently", no "forever", no "cleanly". State the exact guarantee or say nothing.

## Restraint

- A caption may not restate the control it sits under. If the sentence describes the button below it, cut the sentence.
- State a fact once per screen. Two sentences explaining one mechanism from different angles is one sentence too many.
- No parentheticals carrying technical qualifiers: "(GPS)", "(iOS)". A file extension the recipient needs — "Download Excel (.xlsx)" — is information, not a caveat, and stays.
- Bottom-sheet subtitles are `noWrap`. Budget ~40 characters; a subtitle can never be the only place a money-safety fact is stated.
- Placeholders are examples ("Dana Smith", "manager@example.com", "Client visit"), never restatements of the label.
- Warmth is allowed in empty states and zero-stakes moments — but a line must still carry information. "Log a trip once, then repeat it with one tap." earns its place; a tagline that only supplies rhythm or restates the screen does not (the cockpit's deleted "Nothing else to tap — just drive" is the cautionary example).

## The two readers

- Every artifact that leaves the app — email subject, filename, spreadsheet header, `/r` page, print title — names the driver and the period without app context.
- Filenames lead with what the document is and whose it is: `mileage-dana-smith-2026-08-01-to-2026-08-15.xlsx`.
- Explain mechanism only where it answers a question the recipient actually has (why a forwarded link broke). Never as a product boast, and never to reassure him about a risk he had not considered.
- The `/r` footer is attribution and nothing else.
