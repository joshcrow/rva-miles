"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import type { Place, Route, Settings, Trip } from "@/types";
import { addDaysKey, formatKey } from "@/lib/dates";
import { reverseGeocode, routeMiles } from "@/lib/geocode";
import { routeFromTrip } from "@/lib/routesLogic";
import { uiActions } from "@/stores/ui";
import { brand } from "@/theme/theme";
import Sheet from "./Sheet";
import PlaceField from "./PlaceField";
import { fmtMiles, placeKey, placeLabel } from "./format";
import { findMatchingRoute, newId } from "./tripActions";

export interface NewTripPayload {
  trip: Trip;
  route: Route;
  /** The route as it was before this log, or null when the tile is brand new. */
  prevRoute: Route | null;
}

export interface NewTripSheetProps {
  open: boolean;
  onClose: () => void;
  today: string;
  initialDateKey: string;
  settings: Settings;
  routes: Route[];
  topOrigins: Place[];
  /** Resolves true when the trip was persisted. */
  onSubmit: (p: NewTripPayload) => Promise<boolean>;
}

type DistanceState = "idle" | "resolving" | "resolved" | "unavailable";

export function NewTripSheet({
  open,
  onClose,
  today,
  initialDateKey,
  settings,
  routes,
  topOrigins,
  onSubmit,
}: NewTripSheetProps) {
  const [from, setFrom] = useState<Place | null>(() => topOrigins[0] ?? null);
  const [to, setTo] = useState<Place | null>(null);
  const [distance, setDistance] = useState("");
  const [distanceState, setDistanceState] = useState<DistanceState>("idle");
  const [roundTrip, setRoundTrip] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [dateKey, setDateKey] = useState(initialDateKey || today);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolveSeq = useRef(0);

  const fromLat = from?.latLng?.lat;
  const fromLng = from?.latLng?.lng;
  const toLat = to?.latLng?.lat;
  const toLng = to?.latLng?.lng;

  // Road distance for a newly-complete endpoint pair. A failure here is not an
  // error state — the field simply becomes manual entry.
  useEffect(() => {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      setDistanceState((s) => (s === "resolving" ? "idle" : s));
      return;
    }
    const id = ++resolveSeq.current;
    setDistanceState("resolving");
    void routeMiles({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }).then((res) => {
      if (id !== resolveSeq.current) return;
      if (!res) {
        setDistanceState("unavailable");
        return;
      }
      setDistance(res.miles.toFixed(1));
      setDistanceState("resolved");
    });
  }, [fromLat, fromLng, toLat, toLng]);

  const parsed = Number.parseFloat(distance);
  const distanceValid = Number.isFinite(parsed) && parsed > 0;
  const total = roundTrip ? parsed * 2 : parsed;
  const canSubmit = Boolean(from && to) && distanceValid && !saving;

  const manualHint = useMemo(() => {
    if (distanceState === "unavailable") {
      return "Couldn't reach the routing service — type the miles and log it anyway.";
    }
    if (from && to && (!from.latLng || !to.latLng)) {
      return "No map pin for one of these places — type the miles yourself.";
    }
    return null;
  }, [distanceState, from, to]);

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
      setFrom({ name: label ?? "Current location", address: label ?? undefined, latLng });
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
    if (!from || !to || !distanceValid) return;
    setSaving(true);
    const now = Date.now();
    const prevRoute = findMatchingRoute(routes, from, to) ?? null;
    const routeId = prevRoute?.id ?? newId();

    const trip: Trip = {
      id: newId(),
      dateKey,
      from,
      to,
      distanceMiles: total,
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
          from,
          to,
          distanceMiles: parsed,
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

  const originChips = topOrigins.slice(0, 3);
  const yesterday = today ? addDaysKey(today, -1) : "";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New trip"
      subtitle="Logged once, then it's a tile forever"
      footer={
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!canSubmit}
          onClick={() => void submit()}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{
            background: canSubmit ? brand.gradient : undefined,
            color: canSubmit ? "#fff" : undefined,
          }}
        >
          {saving ? "Logging…" : distanceValid ? `Log ${fmtMiles(total)} mi` : "Log trip"}
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
                onClick={() => setFrom(o)}
                color={from && placeKey(from) === placeKey(o) ? "primary" : "default"}
                variant={from && placeKey(from) === placeKey(o) ? "filled" : "outlined"}
                sx={{ flexShrink: 0, maxWidth: 180 }}
              />
            ))}
          </Stack>

          <PlaceField label="From" value={from} onChange={setFrom} placeholder="Starting point" />
        </Box>

        <PlaceField
          label="To"
          value={to}
          onChange={setTo}
          placeholder="Where did you drive?"
          nearLat={fromLat}
          nearLng={fromLng}
          autoFocus={Boolean(from)}
        />

        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 2,
            py: 1.75,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" color="text.secondary">
              Distance
            </Typography>
            {distanceState === "resolving" ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CircularProgress size={13} />
                <Typography variant="caption" color="text.secondary">
                  Measuring road route…
                </Typography>
              </Stack>
            ) : distanceState === "resolved" ? (
              <Typography variant="caption" color="text.secondary">
                Road route — edit if needed
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" alignItems="baseline" justifyContent="center" spacing={0.75} sx={{ mt: 0.5 }}>
            <InputBase
              value={distance}
              onChange={(e) => {
                setDistance(e.target.value.replace(/[^0-9.]/g, ""));
                setDistanceState("idle");
              }}
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
            <Typography variant="h5" color="text.secondary">
              mi
            </Typography>
          </Stack>

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
              {roundTrip && distanceValid ? (
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }} className="tnum">
                  {fmtMiles(parsed)} × 2 = {fmtMiles(total)} mi logged
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

          {manualHint ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              {manualHint}
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
