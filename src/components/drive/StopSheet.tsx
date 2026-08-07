"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FlagRounded from "@mui/icons-material/FlagRounded";
import NotesRounded from "@mui/icons-material/NotesRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import RouteRounded from "@mui/icons-material/RouteRounded";
import SatelliteAltRounded from "@mui/icons-material/SatelliteAltRounded";
import type { LatLng, Place, Route, Settings, Trip } from "@/types";
import { archiveRoute, putRoute, putTrip, softDeleteTrip } from "@/lib/db";
import { toDateKey } from "@/lib/dates";
import { encodeTrack, simplifyTrack } from "@/lib/geo";
import { reverseGeocode, routeMiles } from "@/lib/geocode";
import { newId } from "@/lib/ids";
import { formatRate } from "@/lib/rates";
import { routeFromTrip } from "@/lib/routesLogic";
import type { CompletedDrive } from "@/lib/tracking";
import { uiActions } from "@/stores/ui";
import { radii } from "@/theme/theme";
import { formatClock, formatElapsed, formatMiles, formatMoney } from "./driveFormat";
import {
  analyzeShape,
  billedMiles,
  shouldOfferChoice,
  shouldPreferRoute,
  type DistanceSource,
} from "./reconcile";

interface StopSheetProps {
  open: boolean;
  drive: CompletedDrive;
  settings: Settings;
  /** Clears a recovered ActiveDrive row — called only once the trip is safely on disk. */
  finalize: () => Promise<void>;
  onSaved: () => void;
  onDiscard: () => void;
}

type ReconcileState = "off" | "loading" | "done" | "failed";

function sanitizeDistance(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

function toPlace(name: string, latLng?: LatLng): Place {
  const place: Place = {};
  const trimmed = name.trim();
  if (trimmed) place.name = trimmed;
  if (latLng) place.latLng = latLng;
  return place;
}

export function StopSheet({ open, drive, settings, finalize, onSaved, onDiscard }: StopSheetProps) {
  const gpsMiles = drive.distanceMiles;
  const { isLoop, canReconcile } = analyzeShape(gpsMiles, drive.from, drive.to);

  const [source, setSource] = useState<DistanceSource>("gps");
  const [roadMiles, setRoadMiles] = useState<number | null>(null);
  const [reconcile, setReconcile] = useState<ReconcileState>(canReconcile ? "loading" : "off");
  const [distanceText, setDistanceText] = useState(() => gpsMiles.toFixed(1));
  const [handEdited, setHandEdited] = useState(false);
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [locating, setLocating] = useState(Boolean(drive.from || drive.to));
  const [purpose, setPurpose] = useState("");
  const [roundTrip, setRoundTrip] = useState(isLoop);
  const [saveTile, setSaveTile] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs mirror state that late-resolving network effects must read without
  // re-running: they must never clobber something the driver already typed.
  const handEditedRef = useRef(false);
  const roundTripRef = useRef(isLoop);
  const fromTouched = useRef(false);
  const toTouched = useRef(false);
  const tileTouched = useRef(false);

  function milesFor(src: DistanceSource, rt: boolean, road: number | null): number {
    return billedMiles({ gpsMiles, roadMiles: road, source: src, roundTrip: rt, isLoop });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [f, t] = await Promise.all([
        drive.from ? reverseGeocode(drive.from) : Promise.resolve(null),
        drive.to ? reverseGeocode(drive.to) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (f && !fromTouched.current) setFromName(f);
      if (t && !toTouched.current) setToName(t);
      if (!tileTouched.current) setSaveTile(Boolean(f && t) && !isLoop);
      setLocating(false);
    })();
    return () => {
      cancelled = true;
    };
    // Mounted once per drive (parent keys this component by drive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canReconcile || !drive.from || !drive.to) return;
    const from = drive.from;
    const to = drive.to;
    let cancelled = false;
    void (async () => {
      const result = await routeMiles(from, to);
      if (cancelled) return;
      if (!result || !Number.isFinite(result.miles) || result.miles <= 0) {
        setReconcile("failed");
        return;
      }
      setRoadMiles(result.miles);
      setReconcile("done");
      if (shouldPreferRoute(gpsMiles, result.miles) && !handEditedRef.current) {
        setSource("route");
        setDistanceText(milesFor("route", roundTripRef.current, result.miles).toFixed(1));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeSource(next: DistanceSource) {
    setSource(next);
    setDistanceText(milesFor(next, roundTripRef.current, roadMiles).toFixed(1));
    setHandEdited(false);
    handEditedRef.current = false;
  }

  function changeRoundTrip(next: boolean) {
    setRoundTrip(next);
    roundTripRef.current = next;
    if (isLoop) return; // flag only — the measurement is unchanged
    setDistanceText(milesFor(source, next, roadMiles).toFixed(1));
    setHandEdited(false);
    handEditedRef.current = false;
  }

  const finalMiles = Number(distanceText);
  const validDistance = Number.isFinite(finalMiles) && finalMiles > 0;
  const amount = validDistance ? finalMiles * settings.ratePerMile : 0;
  const showChoice = reconcile === "done" && shouldOfferChoice(gpsMiles, roadMiles);

  async function undoSave(tripId: string, routeId?: string) {
    try {
      await softDeleteTrip(tripId);
    } catch (err) {
      uiActions.showError(err, "Couldn't undo that — the trip is still in your log.");
      return;
    }
    if (routeId) {
      try {
        await archiveRoute(routeId);
      } catch {
        uiActions.showSnack("Trip removed — its route is still on Home.", "warning");
        return;
      }
    }
    uiActions.showSnack("Trip removed", "info");
  }

  async function handleSave() {
    if (!validDistance || saving) return;
    setSaving(true);

    const now = Date.now();
    const tripId = newId();
    const routeId = saveTile ? newId() : undefined;
    const track = simplifyTrack(drive.points);
    const trip: Trip = {
      id: tripId,
      dateKey: toDateKey(drive.startedAt),
      startTime: drive.startedAt,
      endTime: drive.endedAt,
      from: toPlace(fromName, drive.from),
      to: toPlace(toName, drive.to),
      distanceMiles: finalMiles,
      gpsDistanceMiles: gpsMiles,
      roundTrip: roundTrip || undefined,
      purpose: purpose.trim() || undefined,
      vehicle: settings.vehicle,
      ratePerMile: settings.ratePerMile,
      routeId,
      polyline: track.length > 1 ? encodeTrack(track) : undefined,
      source: "gps",
      createdAt: now,
      updatedAt: now,
    };

    try {
      await putTrip(trip);
    } catch (err) {
      // The ledger write is the one thing that must not fail quietly. Keep
      // the sheet open with every field intact so nothing typed is lost.
      uiActions.showError(err, "Couldn't save this trip. Nothing was lost — try again.");
      setSaving(false);
      return;
    }

    if (routeId) {
      const route: Route = { ...routeFromTrip(trip), id: routeId, createdAt: now, updatedAt: now };
      try {
        await putRoute(route);
      } catch (err) {
        uiActions.showError(
          err,
          "Trip saved. The route couldn't be added to Home — you can add it next time.",
        );
      }
    }

    try {
      await finalize();
    } catch (err) {
      uiActions.showError(
        err,
        "Trip saved. The drive is still listed as unfinished — discard it on the drive screen.",
      );
    }

    uiActions.showUndo(`Logged ${formatMiles(finalMiles, 1)} mi · ${formatMoney(amount)}`, () => {
      void undoSave(tripId, routeId);
    });
    onSaved();
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      // Deliberately not dismissible: this drive is not on disk yet. The two
      // ways out are both on screen, and Discard is undoable.
      onClose={() => undefined}
      slotProps={{ paper: { sx: { maxHeight: "94dvh", overflowY: "auto" } } }}
    >
      <Box sx={{ px: 3, pt: 1.5, pb: 3 }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 4,
            borderRadius: `${radii.pill}px`,
            bgcolor: "divider",
            mx: "auto",
            mb: 2,
          }}
        />

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Drive complete
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.75}>
              <Typography
                sx={{
                  fontSize: "2.75rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {validDistance ? formatMiles(finalMiles, 1) : "—"}
              </Typography>
              <Typography variant="h5" color="text.secondary">
                mi
              </Typography>
            </Stack>
          </Box>
          <Stack alignItems="flex-end">
            <Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "success.main",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {formatMoney(amount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              at {formatRate(settings.ratePerMile)}/mi
            </Typography>
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {formatClock(drive.startedAt)} – {formatClock(drive.endedAt)} ·{" "}
          {formatElapsed(drive.endedAt - drive.startedAt)} driving
        </Typography>

        {showChoice && roadMiles != null ? (
          <Stack spacing={1} sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2">Which distance should be billed?</Typography>
            <Stack direction="row" spacing={1.25} role="radiogroup" aria-label="Which distance should be billed">
              <SourceCard
                selected={source === "gps"}
                onClick={() => changeSource("gps")}
                icon={<SatelliteAltRounded sx={{ fontSize: 18 }} />}
                label="GPS"
                value={`${formatMiles(gpsMiles)} mi`}
                note="what your phone measured"
              />
              <SourceCard
                selected={source === "route"}
                onClick={() => changeSource("route")}
                icon={<RouteRounded sx={{ fontSize: 18 }} />}
                label="Route"
                value={`${formatMiles(roadMiles)} mi`}
                note="road distance for this trip"
              />
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }} color="text.secondary">
            {reconcile === "loading" ? <CircularProgress size={14} thickness={5} /> : null}
            <Typography variant="body2">
              GPS measured {formatMiles(gpsMiles)} mi
              {reconcile === "loading"
                ? " · checking road distance…"
                : reconcile === "done"
                  ? " · matches the road distance"
                  : reconcile === "failed"
                    ? " · couldn't check road distance"
                    : isLoop
                      ? " · round trip, so no road distance to compare"
                      : ""}
            </Typography>
          </Stack>
        )}

        <Stack spacing={2}>
          <TextField
            label="Billed distance"
            value={distanceText}
            onChange={(e) => {
              setHandEdited(true);
              handEditedRef.current = true;
              setDistanceText(sanitizeDistance(e.target.value));
            }}
            inputMode="decimal"
            error={!validDistance}
            helperText={
              !validDistance
                ? "Enter a distance greater than 0."
                : handEdited
                  ? "Manually adjusted"
                  : " "
            }
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">mi</InputAdornment> },
            }}
          />

          <TextField
            label="From"
            value={fromName}
            onChange={(e) => {
              fromTouched.current = true;
              setFromName(e.target.value);
            }}
            placeholder={locating ? "Finding address…" : "Starting point"}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceRounded sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="To"
            value={toName}
            onChange={(e) => {
              toTouched.current = true;
              setToName(e.target.value);
            }}
            placeholder={locating ? "Finding address…" : "Destination"}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <FlagRounded sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Purpose (optional)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Client visit, supply run…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <NotesRounded sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <SwitchRow
          checked={roundTrip}
          onChange={changeRoundTrip}
          label="Round trip"
          caption={
            isLoop
              ? "You ended where you started — the measured miles already include the return."
              : roundTrip
                ? `Return leg added — billing ${formatMiles(finalMiles)} mi.`
                : "Turn on if you also drove back but didn't track it."
          }
        />

        <SwitchRow
          checked={saveTile}
          onChange={(next) => {
            tileTouched.current = true;
            setSaveTile(next);
          }}
          label="Save as a route"
          caption="Adds it to Home so logging it again is one tap."
        />

        <Stack spacing={1.25} sx={{ mt: 3 }}>
          <Button
            size="large"
            variant="contained"
            onClick={() => void handleSave()}
            disabled={!validDistance || saving}
            sx={{ minHeight: 58, fontSize: "1rem", fontWeight: 700 }}
          >
            {saving ? "Saving…" : "Save trip"}
          </Button>
          <Button
            size="large"
            color="inherit"
            onClick={onDiscard}
            disabled={saving}
            sx={{ minHeight: 50, color: "text.secondary" }}
          >
            Discard drive
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

interface SourceCardProps {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}

function SourceCard({ selected, onClick, icon, label, value, note }: SourceCardProps) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      // Selection reads from the border and fill alone — a shadow on one of
      // two side-by-side cards just made the pair look uneven.
      sx={{
        flex: 1,
        p: 1.75,
        borderRadius: `${radii.card}px`,
        alignItems: "flex-start",
        flexDirection: "column",
        textAlign: "left",
        border: "1.5px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "transparent",
        transition: "border-color .15s ease, background-color .15s ease",
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: selected ? "primary.main" : "text.secondary" }}>
        {icon}
        <Typography variant="overline" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{ fontSize: "1.375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        {note}
      </Typography>
    </ButtonBase>
  );
}

interface SwitchRowProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  caption: string;
}

function SwitchRow({ checked, onChange, label, caption }: SwitchRowProps) {
  return (
    <Stack
      component="label"
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ py: 1, minHeight: 56, cursor: "pointer" }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
          {caption}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        slotProps={{ input: { "aria-label": label } }}
      />
    </Stack>
  );
}

export default StopSheet;
