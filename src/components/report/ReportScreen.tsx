"use client";

// Flow 4, "payday send": pick a period, look at the two numbers, send it.
//
// Every artifact this screen produces — the summary card, the XLSX, the CSV,
// the mail body and the shared link — is built from ONE filtered trip list and
// ONE rounding pass, so they can never disagree with each other.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import type { DateRange, ReportPayload } from "@/types";
import { periodPresets } from "@/lib/periods";
import { buildXlsx, reportFilename } from "@/lib/exporters";
import { reportUrl } from "@/lib/reportlink";
import { canShareFiles, shareFiles } from "@/lib/share";
import { uiActions } from "@/stores/ui";
import EmptyRange from "./EmptyRange";
import PeriodPicker from "./PeriodPicker";
import ReportActions from "./ReportActions";
import ReportSkeleton from "./ReportSkeleton";
import ShareSheet from "./ShareSheet";
import SummaryCard from "./SummaryCard";
import TripPreviewTable from "./TripPreviewTable";
import { useReportData } from "./useReportData";
import {
  CUSTOM_PRESET_LABEL,
  buildMeta,
  buildPayload,
  computeTotals,
  filterTripsInRange,
  normalizeRange,
  reportSubject,
  shareText,
  uniformRate,
} from "./reportData";

const LAST_30_LABEL = "Last 30 days";

export function ReportScreen() {
  const { ready, loadError, today, trips, settings, refresh, saveRecipientEmail } = useReportData();

  const [selected, setSelected] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const presets = useMemo(
    () => (today ? periodPresets(settings.paySchedule, today) : []),
    [settings.paySchedule, today],
  );

  const activeLabel = selected ?? presets[0]?.label ?? "";

  const range = useMemo<DateRange | null>(() => {
    if (!today) return null;
    if (activeLabel === CUSTOM_PRESET_LABEL) {
      return normalizeRange(customRange ?? { startKey: today, endKey: today });
    }
    const found = presets.find((p) => p.label === activeLabel);
    return found?.range ?? presets[0]?.range ?? null;
  }, [today, activeLabel, customRange, presets]);

  const filtered = useMemo(() => (range ? filterTripsInRange(trips, range) : []), [trips, range]);
  const meta = useMemo(
    () => buildMeta(range ?? { startKey: today, endKey: today }, settings),
    [range, today, settings],
  );
  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const rate = useMemo(() => uniformRate(filtered), [filtered]);
  const subject = useMemo(() => reportSubject(meta, totals), [meta, totals]);

  // generatedAt is captured once per selection, so the link, the file and the
  // mail body all claim the same generation moment.
  const payload = useMemo(
    () => buildPayload(filtered, meta, Date.now()),
    [filtered, meta],
  );

  const linkCache = useRef<{ payload: ReportPayload; url: string } | null>(null);
  const latestPayload = useRef(payload);
  useEffect(() => {
    latestPayload.current = payload;
  }, [payload]);

  /** Cached per payload. Returns null (and records why) rather than throwing. */
  const resolveLink = useCallback(async (): Promise<string | null> => {
    if (payload.trips.length === 0) return null;
    if (linkCache.current?.payload === payload) return linkCache.current.url;
    try {
      const url = await reportUrl(window.location.origin, payload);
      linkCache.current = { payload, url };
      if (latestPayload.current === payload) {
        setLink(url);
        setLinkError(null);
      }
      return url;
    } catch (err) {
      // Encoding failures are internal; the sender gets the written sentence.
      console.error("RVA Miles: couldn't build the report link", err);
      if (latestPayload.current === payload) {
        setLink(null);
        setLinkError("Couldn't build the report link.");
      }
      return null;
    }
  }, [payload]);

  // Prewarm, so tapping Share/Email/Copy never waits on encoding.
  useEffect(() => {
    setLink(null);
    setLinkError(null);
    void resolveLink();
  }, [resolveLink]);

  const handleSelect = useCallback(
    (label: string) => {
      if (label === CUSTOM_PRESET_LABEL && range) setCustomRange(range);
      setSelected(label);
    },
    [range],
  );

  const handleWiden = useCallback(() => {
    setSelected(LAST_30_LABEL);
  }, []);

  async function handleShare() {
    if (filtered.length === 0 || sharing) return;
    setSharing(true);
    try {
      const url = await resolveLink();
      const text = shareText(meta, totals, url);

      let file: File | null = null;
      try {
        const blob = await buildXlsx(filtered, meta);
        if (typeof File !== "undefined") {
          file = new File([blob], reportFilename(meta, "xlsx"), { type: blob.type });
        }
      } catch (err) {
        uiActions.showError(err, "Couldn't build the spreadsheet — other options are still open.");
      }

      if (file && canShareFiles([file])) {
        const handled = await shareFiles([file], { title: subject, text });
        if (handled) return;
      }

      // No native file sharing (or it declined) — every other route is here.
      setSheetOpen(true);
    } finally {
      setSharing(false);
    }
  }

  if (loadError) {
    return (
      <Stack sx={{ px: 2.5, pt: 6, alignItems: "center", textAlign: "center" }} spacing={2}>
        <WarningAmberRoundedIcon sx={{ fontSize: 44, color: "error.main" }} />
        <Box>
          <Typography variant="h4">Couldn&apos;t open your trips</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {loadError}
          </Typography>
        </Box>
        <Button
          size="large"
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void refresh()}
        >
          Try again
        </Button>
      </Stack>
    );
  }

  if (!ready || !today || !range) return <ReportSkeleton />;

  const isEmpty = filtered.length === 0;

  return (
    <>
      <Stack spacing={2.5} sx={{ px: 2.5, pt: 2.5, pb: 3 }}>
        <Box component="header">
          <Typography variant="overline" component="p" sx={{ color: "primary.main" }}>
            RVA Miles
          </Typography>
          <Typography variant="h3" component="h1" sx={{ mt: 0.25 }}>
            Report
          </Typography>
        </Box>

        <PeriodPicker
          presets={presets}
          activeLabel={activeLabel}
          onSelect={handleSelect}
          customRange={customRange ?? range}
          onCustomChange={setCustomRange}
        />

        {isEmpty ? (
          <EmptyRange
            range={range}
            onWiden={activeLabel === LAST_30_LABEL ? undefined : handleWiden}
            widenLabel="Show last 30 days"
          />
        ) : (
          <>
            <SummaryCard
              range={range}
              totals={totals}
              ownerName={meta.ownerName}
              vehicle={meta.vehicle}
              rate={rate}
            />
            <TripPreviewTable trips={filtered} />
            <ReportActions
              onShare={() => void handleShare()}
              onMore={() => setSheetOpen(true)}
              sharing={sharing}
            />
          </>
        )}
      </Stack>

      <ShareSheet
        open={sheetOpen && !isEmpty}
        onClose={() => setSheetOpen(false)}
        trips={filtered}
        meta={meta}
        totals={totals}
        subject={subject}
        link={link}
        linkError={linkError}
        recipientEmail={settings.reportRecipient?.email ?? ""}
        onSaveRecipient={(email) => void saveRecipientEmail(email)}
      />
    </>
  );
}

export default ReportScreen;
