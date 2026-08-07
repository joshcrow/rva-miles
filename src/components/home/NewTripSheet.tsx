"use client";

// Manual trip capture — and the only place a multi-leg "stop journey" is
// created. The plain case (From → To) is unchanged and still becomes a one-tap
// tile. Adding a stop turns the sheet into a per-segment ledger: every leg
// gets its own road distance and its own billable switch, so the personal
// detour on the way to a work site is recorded honestly and simply isn't
// billed. `distanceMiles` is written ONCE here (sum of billable legs, or the
// direct-route figure if she chooses it) and nothing downstream recomputes it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import type { Place, Route, Settings, Trip } from "@/types";
import { addDaysKey, formatKey } from "@/lib/dates";
import { reverseGeocode, routeMiles } from "@/lib/geocode";
import { roundTo } from "@/lib/money";
import { routeFromTrip } from "@/lib/routesLogic";
import { uiActions } from "@/stores/ui";
import { radii } from "@/theme/theme";
import Sheet from "./Sheet";
import PlaceField from "./PlaceField";
import { fmtMiles, placeKey, placeLabel } from "./format";
import {
  billedFromSegs,
  buildLegs,
  everyLegMeasured,
  pointLabel,
  rebuildSegs,
  segMilesOf,
  type Pt,
  type Seg,
} from "./stopJourney";
import { findMatchingRoute, newId } from "./tripActions";

export interface NewTripPayload {
  trip: Trip;
  /**
   * The tile this log creates or refreshes. NULL for a stop journey: a
   * one-off multi-leg drive is a ledger entry, not a repeatable one-tap route,
   * and turning it into a tile would put a personal detour on the home screen.
   */
  route: Route | null;
  /** The route as it was before this log, or null when the tile is brand new. */
  prevRoute: Route | null;
}

export interface NewTripSheetProps {
  open: boolean;
  onClose: () => void;
  today: string;
  initialDateKey: string;
  /** Prefilled origin — "Continue from here" passes the previous trip's destination. */
  initialFrom?: Place | null;
  /** Destination name when opened as "Continue from <name>"; drives the subtitle. */
  continuingFrom?: string;
  settings: Settings;
  routes: Route[];
  topOrigins: Place[];
  /** Resolves true when the trip was persisted. */
  onSubmit: (p: NewTripPayload) => Promise<boolean>;
}

/** Three stops would be a route planner; two covers "home → family → work site". */
const MAX_STOPS = 2;

export function NewTripSheet({
  open,
  onClose,
  today,
  initialDateKey,
  initialFrom,
  continuingFrom,
  settings,
  routes,
  topOrigins,
  onSubmit,
}: NewTripSheetProps) {
  const initialOrigin = initialFrom ?? topOrigins[0] ?? null;

  const [from, setFrom] = useState<Pt>(initialOrigin);
  const [stops, setStops] = useState<Pt[]>([]);
  const [to, setTo] = useState<Pt>(null);
  const [segs, setSegs] = useState<Seg[]>(() => rebuildSegs([], [initialOrigin, null]));
  const [roundTrip, setRoundTrip] = useState(false);
  const [useDirect, setUseDirect] = useState(false);
  const [direct, setDirect] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("");
  const [dateKey, setDateKey] = useState(initialDateKey || today);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const alive = useRef(true);
  const directAttempt = useRef("");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const points = useMemo<Pt[]>(() => [from, ...stops, to], [from, stops, to]);
  const stopCount = stops.length;
  const hasStops = stopCount > 0;

  // Every place change rewrites the point list and the segment list together,
  // in one batched update, so the two can never disagree about how many legs
  // this journey has.
  const applyPoints = useCallback((nextFrom: Pt, nextStops: Pt[], nextTo: Pt) => {
    setFrom(nextFrom);
    setStops(nextStops);
    setTo(nextTo);
    setSegs((prev) => rebuildSegs(prev, [nextFrom, ...nextStops, nextTo]));
    // "Bill the direct route" is meaningless once there is no detour to skip.
    setUseDirect((prev) => (nextStops.length > 0 ? prev : false));
  }, []);

  const setStopAt = (index: number, p: Pt) =>
    applyPoints(from, stops.map((s, i) => (i === index ? p : s)), to);

  const addStop = () => {
    if (stopCount >= MAX_STOPS) return;
    applyPoints(from, [...stops, null], to);
  };

  const removeStop = (index: number) =>
    applyPoints(from, stops.filter((_, i) => i !== index), to);

  // Road distance per segment. A failure is never an error state — the leg
  // simply becomes manual entry, exactly as it does offline.
  useEffect(() => {
    const queued = segs.map((seg, i) => ({ seg, i })).filter((e) => e.seg.status === "queued");
    if (queued.length === 0) return;

    // Returning `prev` unchanged where nothing moved keeps this effect from
    // re-running itself: queued -> resolving -> (settled) and then quiet.
    setSegs((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        if (s.status !== "queued") return s;
        changed = true;
        return { ...s, status: "resolving" as const };
      });
      return changed ? next : prev;
    });

    for (const { seg, i } of queued) {
      const a = points[i]?.latLng;
      const b = points[i + 1]?.latLng;
      if (!a || !b) continue;
      const { key } = seg;
      void routeMiles(a, b).then((res) => {
        if (!alive.current) return;
        // Matched by endpoint identity, so a result for a pair she has since
        // changed is discarded rather than written onto the new leg.
        setSegs((prev) => {
          let changed = false;
          const next = prev.map((cur) => {
            if (cur.key !== key || cur.status !== "resolving") return cur;
            changed = true;
            if (!res) return { ...cur, status: "unavailable" as const };
            return { ...cur, distance: res.miles.toFixed(1), status: "resolved" as const };
          });
          return changed ? next : prev;
        });
      });
    }
  }, [segs, points]);

  const fromLat = from?.latLng?.lat;
  const fromLng = from?.latLng?.lng;
  const toLat = to?.latLng?.lat;
  const toLng = to?.latLng?.lng;

  // The "what if I'd driven straight there?" figure, only meaningful once a
  // stop exists. Informational: it is offered as an alternative billing basis,
  // and stored on the trip either way so the choice stays auditable.
  useEffect(() => {
    if (!hasStops || fromLat == null || fromLng == null || toLat == null || toLng == null) {
      directAttempt.current = "";
      setDirect(null);
      return;
    }
    const key = `${fromLat},${fromLng}>${toLat},${toLng}`;
    if (directAttempt.current === key) return;
    directAttempt.current = key;
    void routeMiles({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }).then((res) => {
      if (!alive.current || directAttempt.current !== key) return;
      setDirect(res ? roundTo(res.miles, 1) : null);
    });
  }, [hasStops, fromLat, fromLng, toLat, toLng]);

  // ---------------------------------------------------------------------
  // Derived numbers — one authoritative billed total
  // ---------------------------------------------------------------------

  const measured = everyLegMeasured(segs);
  const everyPointFilled = points.every(Boolean);

  const oneWay = segMilesOf(segs)[0];
  const simpleTotal = roundTrip ? roundTo(oneWay * 2, 1) : oneWay;

  const canUseDirect = hasStops && direct !== null && direct > 0;
  const billingDirect = useDirect && canUseDirect;
  const billedTotal = hasStops
    ? billingDirect
      ? (direct as number)
      : billedFromSegs(segs)
    : simpleTotal;

  const billedCount = segs.filter((s) => s.billable).length;
  const canSubmit = everyPointFilled && measured && billedTotal > 0 && !saving;

  const manualHint = useMemo(() => {
    if (hasStops) return null;
    if (segs[0]?.status === "unavailable") {
      return "Couldn't measure that route — type the miles and log it anyway.";
    }
    if (from && to && (!from.latLng || !to.latLng)) {
      return "No map pin for one of these places — type the miles yourself.";
    }
    return null;
  }, [hasStops, segs, from, to]);

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  const pickCurrentLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      uiActions.showSnack("This device can't share its location.", "warning");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 60_000,
        });
      });
      const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const label = await reverseGeocode(latLng);
      applyPoints(
        { name: label ?? "Current location", address: label ?? undefined, latLng },
        stops,
        to,
      );
    } catch (err) {
      const denied = (err as GeolocationPositionError | undefined)?.code === 1;
      uiActions.showSnack(
        denied
          ? "Location is off for this site — pick a starting point instead."
          : "Couldn't get your location — pick a starting point instead.",
        "warning",
      );
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    const filled = points.filter((p): p is Place => Boolean(p));
    if (filled.length !== points.length) return;

    setSaving(true);
    const now = Date.now();
    const origin = filled[0];
    const destination = filled[filled.length - 1];

    const legs = buildLegs(points, segs);
    if (hasStops) {
      if (!legs) {
        setSaving(false);
        uiActions.showSnack("Fill in every stop and its miles before logging.", "warning");
        return;
      }

      const trip: Trip = {
        id: newId(),
        dateKey,
        from: origin,
        to: destination,
        // Written once, here. Reports, exports and the shared link all trust
        // this number and never re-derive it from `legs`.
        distanceMiles: billedTotal,
        legs,
        directMiles: direct ?? undefined,
        purpose: purpose.trim() || undefined,
        vehicle: settings.vehicle,
        ratePerMile: settings.ratePerMile,
        source: "manual",
        createdAt: now,
        updatedAt: now,
      };

      const ok = await onSubmit({ trip, route: null, prevRoute: null });
      setSaving(false);
      if (ok) onClose();
      return;
    }

    const prevRoute = findMatchingRoute(routes, origin, destination) ?? null;
    const routeId = prevRoute?.id ?? newId();

    const trip: Trip = {
      id: newId(),
      dateKey,
      from: origin,
      to: destination,
      distanceMiles: billedTotal,
      roundTrip: roundTrip || undefined,
      purpose: purpose.trim() || undefined,
      vehicle: settings.vehicle,
      ratePerMile: settings.ratePerMile,
      routeId,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };

    const route: Route = prevRoute
      ? {
          ...prevRoute,
          from: origin,
          to: destination,
          distanceMiles: oneWay,
          defaultPurpose: trip.purpose ?? prevRoute.defaultPurpose,
          defaultRoundTrip: roundTrip,
          timesUsed: prevRoute.timesUsed + 1,
          lastUsedAt: now,
          updatedAt: now,
          archived: false,
        }
      : { ...routeFromTrip(trip), id: routeId, createdAt: now, updatedAt: now };

    const ok = await onSubmit({ trip, route, prevRoute });
    setSaving(false);
    if (ok) onClose();
  };

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const originChips = topOrigins.slice(0, 3);
  const yesterday = today ? addDaysKey(today, -1) : "";

  const subtitle = continuingFrom
    ? `Continuing from ${continuingFrom}`
    : hasStops
      ? "One entry, billed leg by leg"
      : "Logged once, then one tap after that";

  const setSegField = (index: number, patch: Partial<Seg>) =>
    setSegs((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const addStopButton =
    stopCount < MAX_STOPS ? (
      <Button
        size="small"
        startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
        onClick={addStop}
        sx={{ alignSelf: "flex-start", color: "text.secondary", ml: -1 }}
      >
        Add stop
      </Button>
    ) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New trip"
      subtitle={subtitle}
      footer={
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!canSubmit}
          onClick={() => void submit()}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {saving ? "Logging…" : canSubmit ? `Log ${fmtMiles(billedTotal)} mi` : "Log trip"}
        </Button>
      }
    >
      <Stack spacing={2.25} sx={{ pb: 1 }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 1.25, overflowX: "auto", pb: 0.5 }}>
            <Chip
              icon={locating ? undefined : <MyLocationRoundedIcon />}
              label={locating ? "Locating…" : "Current location"}
              onClick={() => void pickCurrentLocation()}
              disabled={locating}
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
            {originChips.map((o) => (
              <Chip
                key={placeKey(o)}
                label={placeLabel(o)}
                onClick={() => applyPoints(o, stops, to)}
                color={from && placeKey(from) === placeKey(o) ? "primary" : "default"}
                variant={from && placeKey(from) === placeKey(o) ? "filled" : "outlined"}
                sx={{ flexShrink: 0, maxWidth: 180 }}
              />
            ))}
          </Stack>

          <PlaceField
            label="From"
            value={from}
            onChange={(p) => applyPoints(p, stops, to)}
            placeholder="Starting point"
          />
        </Box>

        {stops.map((stop, i) => (
          <Stack key={`stop-${i}`} direction="row" spacing={0.5} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <PlaceField
                label={stopCount === 1 ? "Stop" : `Stop ${i + 1}`}
                value={stop}
                onChange={(p) => setStopAt(i, p)}
                placeholder="Where did you stop?"
                nearLat={points[i]?.latLng?.lat}
                nearLng={points[i]?.latLng?.lng}
                // A stop is only ever null on the render right after it was
                // added, so this focuses the field she just asked for.
                autoFocus={stop === null}
              />
            </Box>
            <IconButton
              aria-label={`Remove ${stopCount === 1 ? "stop" : `stop ${i + 1}`}`}
              onClick={() => removeStop(i)}
              sx={{ mt: 0.5, flexShrink: 0, color: "text.secondary" }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}

        {addStopButton}

        <PlaceField
          label="To"
          value={to}
          onChange={(p) => applyPoints(from, stops, p)}
          placeholder="Where did you drive?"
          nearLat={points[points.length - 2]?.latLng?.lat}
          nearLng={points[points.length - 2]?.latLng?.lng}
          autoFocus={Boolean(from)}
        />

        <Box
          sx={{
            borderRadius: `${radii.card}px`,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 2,
            py: 1.75,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" color="text.secondary">
              {hasStops ? "Billed distance" : "Distance"}
            </Typography>
            {!hasStops && segs[0]?.status === "resolving" ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CircularProgress size={13} />
                <Typography variant="caption" color="text.secondary">
                  Measuring road route…
                </Typography>
              </Stack>
            ) : !hasStops && segs[0]?.status === "resolved" ? (
              <Typography variant="caption" color="text.secondary">
                Road route — edit if needed
              </Typography>
            ) : hasStops ? (
              <Typography variant="caption" color="text.secondary">
                {`${billedCount} of ${segs.length} legs billed`}
              </Typography>
            ) : null}
          </Stack>

          {hasStops ? (
            <Stack spacing={0.75} sx={{ mt: 1.25 }}>
              {segs.map((seg, i) => {
                const label = `${pointLabel(points[i], i, points.length)} → ${pointLabel(
                  points[i + 1],
                  i + 1,
                  points.length,
                )}`;
                const note = !seg.billable
                  ? "Personal — not billed"
                  : seg.status === "resolving"
                    ? "Measuring road route…"
                    : seg.status === "unavailable"
                      ? "Couldn't measure this leg — type the miles"
                      : seg.status === "idle" && !seg.distance
                        ? "No map pin — type the miles"
                        : "";

                return (
                  <Box
                    key={`leg-${i}`}
                    sx={{
                      borderRadius: `${radii.control}px`,
                      border: "1px solid",
                      borderColor: "divider",
                      px: 1.5,
                      py: 1,
                      // An unbilled leg recedes: still on the record, visibly
                      // not part of the money.
                      opacity: seg.billable ? 1 : 0.62,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: 1 }} noWrap>
                        {label}
                      </Typography>
                      <Stack direction="row" alignItems="baseline" spacing={0.25} sx={{ flexShrink: 0 }}>
                        <InputBase
                          value={seg.distance}
                          onChange={(e) =>
                            setSegField(i, {
                              distance: e.target.value.replace(/[^0-9.]/g, ""),
                              status: "idle",
                            })
                          }
                          placeholder="0.0"
                          inputProps={{
                            inputMode: "decimal",
                            "aria-label": `Miles for ${label}`,
                            style: {
                              width: 48,
                              padding: 0,
                              textAlign: "right",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          mi
                        </Typography>
                      </Stack>
                      <Switch
                        size="small"
                        checked={seg.billable}
                        onChange={(e) => setSegField(i, { billable: e.target.checked })}
                        inputProps={{ "aria-label": `Bill ${label}` }}
                        sx={{ flexShrink: 0 }}
                      />
                    </Stack>
                    {note ? (
                      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25 }}>
                        {note}
                      </Typography>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          ) : null}

          <Stack
            direction="row"
            alignItems="baseline"
            justifyContent="center"
            spacing={0.75}
            sx={{ mt: hasStops ? 1.5 : 0.5 }}
          >
            {hasStops ? (
              <Typography
                component="span"
                className="tnum"
                sx={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
              >
                {fmtMiles(billedTotal)}
              </Typography>
            ) : (
              <InputBase
                value={segs[0]?.distance ?? ""}
                onChange={(e) =>
                  setSegField(0, { distance: e.target.value.replace(/[^0-9.]/g, ""), status: "idle" })
                }
                placeholder="0.0"
                inputProps={{
                  inputMode: "decimal",
                  "aria-label": "Distance in miles",
                  style: {
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    textAlign: "right",
                    padding: 0,
                    width: 138,
                    fontVariantNumeric: "tabular-nums",
                  },
                }}
              />
            )}
            <Typography variant="h5" color="text.secondary">
              mi
            </Typography>
          </Stack>

          {hasStops ? (
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ textAlign: "center", mt: 0.25 }}
            >
              {billingDirect ? "Billing the direct route" : "Sum of the billed legs"}
            </Typography>
          ) : null}

          {canUseDirect ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                {`Direct route: ${fmtMiles(direct as number)} mi`}
              </Typography>
              <Chip
                size="small"
                label="Bill the direct route"
                aria-pressed={billingDirect}
                onClick={() => setUseDirect((v) => !v)}
                color={billingDirect ? "primary" : "default"}
                variant={billingDirect ? "filled" : "outlined"}
                sx={{ flexShrink: 0 }}
              />
            </Stack>
          ) : null}

          {/* A stop journey is already leg-by-leg; doubling it would be a
              guess about which legs repeat, so the toggle steps aside. */}
          {!hasStops ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 1, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Round trip
                </Typography>
                {roundTrip && Number.isFinite(oneWay) && oneWay > 0 ? (
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }} className="tnum">
                    {fmtMiles(oneWay)} × 2 = {fmtMiles(simpleTotal)} mi logged
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Double it for the drive home
                  </Typography>
                )}
              </Box>
              <Switch
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
                inputProps={{ "aria-label": "Round trip" }}
              />
            </Stack>
          ) : null}

          {manualHint ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              {manualHint}
            </Typography>
          ) : null}

          {hasStops && everyPointFilled && measured && billedTotal <= 0 ? (
            <Typography variant="caption" color="warning.main" component="p" sx={{ mt: 1 }}>
              Every leg is marked personal — switch one on to bill this trip.
            </Typography>
          ) : null}
        </Box>

        <TextField
          label="Purpose (optional)"
          placeholder="Client visit"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          fullWidth
        />

        <Box>
          <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Date
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label="Today"
              onClick={() => setDateKey(today)}
              color={dateKey === today ? "primary" : "default"}
              variant={dateKey === today ? "filled" : "outlined"}
            />
            <Chip
              label="Yesterday"
              onClick={() => setDateKey(yesterday)}
              color={dateKey === yesterday ? "primary" : "default"}
              variant={dateKey === yesterday ? "filled" : "outlined"}
            />
            <TextField
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value || today)}
              size="small"
              sx={{ flex: 1, minWidth: 132 }}
              slotProps={{ htmlInput: { max: today, "aria-label": "Trip date" } }}
            />
          </Stack>
          {dateKey && dateKey !== today ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
              Logging for {formatKey(dateKey, "weekday")}, {formatKey(dateKey, "long")}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Sheet>
  );
}

export default NewTripSheet;
