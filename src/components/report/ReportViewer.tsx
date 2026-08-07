"use client";

// The page the manager opens. It has no app chrome, no navigation, no
// database access and no network dependency: everything it renders was
// decoded from the URL fragment, which the browser never sends to a server.
//
// It must also survive being printed — "Save as PDF" from this page is the
// document that ends up in an expense file — so the print stylesheet below is
// part of the deliverable, not a nicety.

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import GlobalStyles from "@mui/material/GlobalStyles";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import type { ReportPayload } from "@/types";
import { buildCsv, buildXlsx, reportFilename } from "@/lib/exporters";
import { decodeReport } from "@/lib/reportlink";
import { downloadBlob } from "@/lib/share";
import { brand } from "@/theme/theme";
import { uiActions } from "@/stores/ui";
import { copyText } from "./clipboard";
import {
  REPORT_COLUMNS,
  buildTsv,
  computeTotals,
  displayRows,
  fmtMiles,
  fmtMoney,
  formatTimestamp,
  payloadToMeta,
  payloadToTrips,
  pluralTrips,
  rangeLabelLong,
  sanitizePayload,
  uniformRate,
} from "./reportData";

const MISSING_HASH_MESSAGE =
  "This page needs the full report link, including everything after the # symbol.";

type ViewerState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; payload: ReportPayload };

/**
 * Print rules + one scoped escape hatch: the app shell caps every route at a
 * 480px phone column, which is right for the app and wrong for a document a
 * manager opens on a laptop. Scoped by :has() to this page only, and gone the
 * moment it unmounts.
 */
const viewerStyles = (
  <GlobalStyles
    styles={{
      "main:has(.rva-report-viewer)": { maxWidth: "none !important" },
      "@media print": {
        "@page": { margin: "14mm" },
        "html, body": { background: "#fff !important" },
        ".rva-print-hide": { display: "none !important" },
        ".rva-report-viewer, .rva-report-viewer *": {
          color: "#000 !important",
          background: "transparent !important",
          boxShadow: "none !important",
        },
        ".rva-report-sheet": {
          maxWidth: "none !important",
          padding: "0 !important",
          margin: "0 !important",
        },
        ".rva-brand": {
          WebkitTextFillColor: "#000 !important",
          backgroundImage: "none !important",
        },
        ".rva-report-table": { fontSize: "10.5pt" },
        ".rva-report-table thead": { display: "table-header-group" },
        ".rva-report-table tr": { pageBreakInside: "avoid", breakInside: "avoid" },
        ".rva-report-table th": { borderBottom: "1.5px solid #000 !important" },
        ".rva-report-table td": { borderBottom: "1px solid #CFCFCF !important" },
        ".rva-report-total td": {
          borderTop: "1.5px solid #000 !important",
          borderBottom: "none !important",
        },
      },
    }}
  />
);

const CELL = {
  py: 1,
  px: 1,
  textAlign: "left",
  verticalAlign: "top",
  borderBottom: "1px solid",
  borderColor: "divider",
} as const;

const NUM_CELL = { ...CELL, textAlign: "right", whiteSpace: "nowrap" } as const;

/** Purpose and Rate fold away on a phone; both come back for print. */
const PHONE_HIDDEN = {
  display: { xs: "none", sm: "table-cell" },
  "@media print": { display: "table-cell" },
} as const;

function readFragment(): string {
  const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  try {
    return decodeURIComponent(raw);
  } catch {
    // A stray % in a forwarded link — try the raw form rather than giving up.
    return raw;
  }
}

export function ReportViewer() {
  const [state, setState] = useState<ViewerState>({ kind: "loading" });
  const [busy, setBusy] = useState<"xlsx" | "csv" | "tsv" | null>(null);

  const load = useCallback(async () => {
    const fragment = readFragment();
    if (!fragment) {
      setState({ kind: "error", message: MISSING_HASH_MESSAGE });
      return;
    }
    try {
      const decoded = await decodeReport(fragment);
      setState({ kind: "ready", payload: sanitizePayload(decoded) });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "This report link can't be read.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const onHashChange = () => void load();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [load]);

  // Drives the default filename when the manager prints to PDF.
  useEffect(() => {
    if (state.kind !== "ready") return;
    const previous = document.title;
    document.title = `${state.payload.title} — ${rangeLabelLong(state.payload.range)}`;
    return () => {
      document.title = previous;
    };
  }, [state]);

  if (state.kind === "loading") {
    return (
      <>
        {viewerStyles}
        <Stack
          className="rva-report-viewer"
          sx={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, py: 10 }}
        >
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Opening report…
          </Typography>
        </Stack>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        {viewerStyles}
        <Stack
          className="rva-report-viewer"
          sx={{ px: 3, py: 8, maxWidth: 460, mx: "auto", textAlign: "center", gap: 2 }}
        >
          <Box
            sx={{
              width: 68,
              height: 68,
              mx: "auto",
              borderRadius: "20px",
              display: "grid",
              placeItems: "center",
              backgroundImage: brand.gradient,
              color: "#fff",
              boxShadow: 6,
            }}
          >
            <LinkOffRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h3" component="h1">
            This report can&apos;t be opened
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A report link carries its data after the <Box component="code">#</Box> in the address.
            Some chat and mail apps trim that part when forwarding — ask the sender to send the link
            again, or to send the spreadsheet instead.
          </Typography>
        </Stack>
      </>
    );
  }

  const { payload } = state;
  const trips = payloadToTrips(payload);
  const meta = payloadToMeta(payload);
  const rows = displayRows(trips);
  const totals = computeTotals(trips);
  const rate = uniformRate(trips);

  async function handleXlsx() {
    setBusy("xlsx");
    try {
      const blob = await buildXlsx(trips, meta);
      downloadBlob(blob, reportFilename(meta, "xlsx"));
    } catch (err) {
      uiActions.showError(err, "Couldn't build the spreadsheet.");
    } finally {
      setBusy(null);
    }
  }

  function handleCsv() {
    setBusy("csv");
    try {
      const blob = new Blob(["\uFEFF", buildCsv(trips, meta)], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, reportFilename(meta, "csv"));
    } catch (err) {
      uiActions.showError(err, "Couldn't build the CSV.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyTable() {
    setBusy("tsv");
    try {
      await copyText(buildTsv(trips, meta));
      uiActions.showSnack("Table copied — paste into Excel or Sheets", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't copy the table.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {viewerStyles}
      <Box className="rva-report-viewer" sx={{ width: "100%" }}>
        <Box
          className="rva-report-sheet"
          sx={{ maxWidth: 860, mx: "auto", px: { xs: 2.5, sm: 4 }, py: { xs: 3.5, sm: 5 } }}
        >
          <Box component="header">
            <Typography
              variant="overline"
              component="p"
              className="rva-brand"
              sx={{
                display: "inline-block",
                backgroundImage: brand.gradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Mileage reimbursement
            </Typography>

            <Typography variant="h2" component="h1" sx={{ mt: 0.5 }}>
              {payload.title}
            </Typography>

            <Box
              component="dl"
              sx={{
                mt: 2.5,
                mb: 0,
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, auto)" },
                justifyContent: { sm: "start" },
                columnGap: { xs: 2, sm: 5 },
                rowGap: 1.5,
              }}
            >
              <MetaPair label="Period" value={rangeLabelLong(payload.range)} />
              {payload.ownerName ? <MetaPair label="Driver" value={payload.ownerName} /> : null}
              {payload.vehicle ? <MetaPair label="Vehicle" value={payload.vehicle} /> : null}
              <MetaPair
                label="Generated"
                value={payload.generatedAt ? formatTimestamp(payload.generatedAt) : "—"}
              />
            </Box>
          </Box>

          <Stack
            direction="row"
            sx={{
              mt: 3,
              py: 2,
              px: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              gap: { xs: 2.5, sm: 6 },
              flexWrap: "wrap",
            }}
          >
            <Stat label="Trips" value={String(totals.count)} />
            <Stat label="Total miles" value={fmtMiles(totals.miles)} />
            <Stat label="Reimbursement" value={fmtMoney(totals.money)} money />
            {rate !== null ? <Stat label="Rate" value={`${fmtMoney(rate)}/mi`} /> : null}
          </Stack>

          <Box sx={{ mt: 3, overflowX: "auto" }}>
            <Box
              component="table"
              className="rva-report-table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                "& tbody tr:nth-of-type(even)": { bgcolor: "action.hover" },
              }}
            >
              <Box component="thead">
                <Box component="tr">
                  {REPORT_COLUMNS.map((c, i) => {
                    const numeric = i >= 4;
                    const foldable = c === "Purpose" || c === "Rate";
                    return (
                      <Box
                        component="th"
                        scope="col"
                        key={c}
                        sx={{
                          ...(numeric ? NUM_CELL : CELL),
                          pb: 1,
                          borderBottomWidth: 2,
                          borderColor: "text.primary",
                          fontWeight: 700,
                          fontSize: "0.6875rem",
                          letterSpacing: "0.09em",
                          textTransform: "uppercase",
                          color: "text.secondary",
                          ...(foldable ? PHONE_HIDDEN : null),
                        }}
                      >
                        {c}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box component="tbody">
                {rows.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={REPORT_COLUMNS.length} sx={{ ...CELL, py: 4 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No trips were logged in this period.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  rows.map((r, i) => (
                    <Box component="tr" key={`${r.dateKey}-${i}`}>
                      <Box component="td" sx={{ ...CELL, whiteSpace: "nowrap" }}>
                        {r.date}
                      </Box>
                      <Box component="td" sx={CELL}>
                        {r.from}
                      </Box>
                      <Box component="td" sx={CELL}>
                        {r.to}
                      </Box>
                      <Box component="td" sx={{ ...CELL, ...PHONE_HIDDEN }}>
                        {r.purpose}
                      </Box>
                      <Box component="td" className="tnum" sx={NUM_CELL}>
                        {r.miles}
                      </Box>
                      <Box component="td" className="tnum" sx={{ ...NUM_CELL, ...PHONE_HIDDEN }}>
                        {r.rate}
                      </Box>
                      <Box component="td" className="tnum" sx={{ ...NUM_CELL, fontWeight: 600 }}>
                        {r.amount}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>

              <Box component="tfoot">
                <Box component="tr" className="rva-report-total">
                  <Box
                    component="td"
                    colSpan={4}
                    sx={{
                      ...CELL,
                      display: { xs: "none", sm: "table-cell" },
                      "@media print": { display: "table-cell" },
                      borderBottom: "none",
                      borderTop: "2px solid",
                      borderTopColor: "text.primary",
                      fontWeight: 700,
                    }}
                  >
                    Totals
                  </Box>
                  <Box
                    component="td"
                    colSpan={3}
                    sx={{
                      ...CELL,
                      display: { xs: "table-cell", sm: "none" },
                      "@media print": { display: "none" },
                      borderBottom: "none",
                      borderTop: "2px solid",
                      borderTopColor: "text.primary",
                      fontWeight: 700,
                    }}
                  >
                    Totals
                  </Box>
                  <Box
                    component="td"
                    className="tnum"
                    sx={{
                      ...NUM_CELL,
                      borderBottom: "none",
                      borderTop: "2px solid",
                      borderTopColor: "text.primary",
                      fontWeight: 700,
                    }}
                  >
                    {fmtMiles(totals.miles)}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      ...NUM_CELL,
                      ...PHONE_HIDDEN,
                      borderBottom: "none",
                      borderTop: "2px solid",
                      borderTopColor: "text.primary",
                    }}
                  />
                  <Box
                    component="td"
                    className="tnum"
                    sx={{
                      ...NUM_CELL,
                      borderBottom: "none",
                      borderTop: "2px solid",
                      borderTopColor: "text.primary",
                      fontWeight: 800,
                      color: "success.main",
                    }}
                  >
                    {fmtMoney(totals.money)}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            {`${pluralTrips(totals.count)} · amounts are miles × the rate captured on the day of each trip.`}
          </Typography>

          <Box
            className="rva-print-hide"
            sx={{
              mt: 4,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.25,
            }}
          >
            <Button
              size="large"
              variant="contained"
              startIcon={<GridOnRoundedIcon />}
              onClick={() => void handleXlsx()}
              disabled={busy === "xlsx"}
              sx={{
                backgroundImage: brand.gradient,
                color: "#fff",
                "&.Mui-disabled": { backgroundImage: brand.gradient, color: "#fff", opacity: 0.6 },
              }}
            >
              {busy === "xlsx" ? "Building…" : "Download Excel (.xlsx)"}
            </Button>
            <Button
              size="large"
              variant="outlined"
              startIcon={<DescriptionRoundedIcon />}
              onClick={handleCsv}
              disabled={busy === "csv"}
            >
              Download CSV
            </Button>
            <Button
              size="large"
              variant="outlined"
              startIcon={<ContentCopyRoundedIcon />}
              onClick={() => void handleCopyTable()}
              disabled={busy === "tsv"}
            >
              Copy as table
            </Button>
            <Button
              size="large"
              variant="outlined"
              startIcon={<PrintRoundedIcon />}
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </Button>
          </Box>

          <Typography
            component="footer"
            variant="caption"
            color="text.disabled"
            sx={{ display: "block", mt: 5, textAlign: "center" }}
          >
            Made with RVA Miles · this report travels inside its own link, nothing was uploaded.
          </Typography>
        </Box>
      </Box>
    </>
  );
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
        {value}
      </Typography>
    </Box>
  );
}

function Stat({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="p">
        {label}
      </Typography>
      <Typography
        variant="h3"
        component="p"
        className="tnum"
        sx={money ? { color: "success.main", fontWeight: 800 } : undefined}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default ReportViewer;
