"use client";

// The product's face. Everything here is one tap from a logged trip, every
// mutation is optimistic with an UNDO snackbar (no confirmation dialogs), and
// every storage failure is surfaced loudly through the ui store.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoadRoundedIcon from "@mui/icons-material/AddRoadRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import type { DateRange, Place, Route, Trip } from "@/types";
import { formatKey, isKeyInRange } from "@/lib/dates";
import { archiveRoute, putRoute, putTrip, softDeleteTrip } from "@/lib/db";
import { periodContaining, periodPresets } from "@/lib/periods";
import { catchUpSuggestions, rankTiles } from "@/lib/routesLogic";
import { uiActions } from "@/stores/ui";
import { radii } from "@/theme/theme";
import InstallCoach from "@/components/InstallCoach";
import CatchUpBanner from "./CatchUpBanner";
import CatchUpSheet from "./CatchUpSheet";
import DayPickSheet from "./DayPickSheet";
import EditRouteSheet from "./EditRouteSheet";
import EmptyHero from "./EmptyHero";
import HomeHeader from "./HomeHeader";
import HomeSkeleton from "./HomeSkeleton";
import LoggedToast, { type LoggedToastState } from "./LoggedToast";
import NewTripSheet, { type NewTripPayload } from "./NewTripSheet";
import NewTripTile from "./NewTripTile";
import PeriodChip from "./PeriodChip";
import RecentTrips from "./RecentTrips";
import RouteMenuSheet from "./RouteMenuSheet";
import RouteTile from "./RouteTile";
import { fmtMiles, placeKey, placeLabel, totalsOf } from "./format";
import { CONTINUE_TRIP_PARAM, buildTripFromRoute, bumpRoute } from "./tripActions";
import { useHomeData } from "./useHomeData";

const MAX_TILES = 7;
/** Slightly longer than RouteTile's 450ms pulse so the animation completes. */
const PULSE_MS = 500;
const SAVE_FAILED = "Couldn't save that trip — nothing was logged.";

// --- "continue from here", handed over from the trips ledger ---------------
// The URL is the external store: `?continue=<tripId>` is read through
// useSyncExternalStore (so the server renders '' and hydration stays honest)
// rather than copied into state by an effect.

const continueListeners = new Set<() => void>();

function subscribeContinueParam(onChange: () => void): () => void {
  continueListeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    continueListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function readContinueParam(): string {
  return new URLSearchParams(window.location.search).get(CONTINUE_TRIP_PARAM) ?? "";
}

/** Strips the param — a reload or a back-navigation must not reopen the sheet. */
function clearContinueParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CONTINUE_TRIP_PARAM)) return;
  url.searchParams.delete(CONTINUE_TRIP_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  for (const listener of continueListeners) listener();
}

interface LoggedRef {
  trip: Trip;
  /** The route exactly as it was before the log, for a clean undo. */
  prevRoute: Route;
}

export function HomeScreen() {
  const {
    ready,
    loadError,
    today,
    trips,
    routes,
    settings,
    migratedCount,
    refresh,
    upsertTrip,
    dropTrip,
    upsertRoute,
    dropRoute,
  } = useHomeData();

  const [toast, setToast] = useState<LoggedToastState | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [showAllTiles, setShowAllTiles] = useState(false);
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [menuRouteId, setMenuRouteId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayPickOpen, setDayPickOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [newTripDate, setNewTripDate] = useState("");
  const [newTripFrom, setNewTripFrom] = useState<Place | null>(null);
  const [continuingFrom, setContinuingFrom] = useState("");
  const [newTripKey, setNewTripKey] = useState(0);

  const continueId = useSyncExternalStore(subscribeContinueParam, readContinueParam, () => "");

  const toastSeq = useRef(0);
  const pulseTimer = useRef<number | null>(null);
  const migrationAnnounced = useRef(false);

  useEffect(
    () => () => {
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (migratedCount <= 0 || migrationAnnounced.current) return;
    migrationAnnounced.current = true;
    uiActions.showSnack(
      `Imported ${migratedCount} ${migratedCount === 1 ? "trip" : "trips"} from the previous version`,
      "success",
    );
  }, [migratedCount]);

  // ---------------------------------------------------------------------
  // Derived views
  // ---------------------------------------------------------------------

  const monthRange = useMemo<DateRange | null>(
    () => (today ? periodPresets(undefined, today)[0].range : null),
    [today],
  );

  const periodRange = useMemo<DateRange | null>(() => {
    if (!today) return null;
    return settings.paySchedule ? periodContaining(settings.paySchedule, today) : monthRange;
  }, [today, settings.paySchedule, monthRange]);

  const periodTotals = useMemo(
    () => totalsOf(periodRange ? trips.filter((t) => isKeyInRange(t.dateKey, periodRange)) : []),
    [trips, periodRange],
  );

  const todayTotals = useMemo(
    () => totalsOf(trips.filter((t) => t.dateKey === today)),
    [trips, today],
  );

  // Tile order is recomputed when the set of routes (or the day) changes, not
  // on every log — logging must never make a tile jump out from under the
  // finger that just tapped it, mid-pulse.
  const orderSignature = useMemo(
    () =>
      `${today}|${routes
        .map((r) => r.id)
        .sort()
        .join(",")}`,
    [today, routes],
  );
  const [order, setOrder] = useState<{ signature: string; ids: string[] }>({
    signature: "",
    ids: [],
  });
  if (today && order.signature !== orderSignature) {
    setOrder({ signature: orderSignature, ids: rankTiles(routes, trips, today).map((r) => r.id) });
  }

  const ranked = useMemo(() => {
    const byId = new Map(routes.map((r) => [r.id, r]));
    const out: Route[] = [];
    const placed = new Set<string>();
    for (const id of order.ids) {
      const route = byId.get(id);
      if (!route) continue;
      out.push(route);
      placed.add(id);
    }
    for (const route of routes) if (!placed.has(route.id)) out.push(route);
    return out;
  }, [order.ids, routes]);

  const suggestions = useMemo(
    () => (today ? catchUpSuggestions(routes, trips, today) : []),
    [routes, trips, today],
  );

  const usesThisMonth = useMemo(() => {
    const counts = new Map<string, number>();
    if (!monthRange) return counts;
    for (const t of trips) {
      if (!t.routeId || !isKeyInRange(t.dateKey, monthRange)) continue;
      counts.set(t.routeId, (counts.get(t.routeId) ?? 0) + 1);
    }
    return counts;
  }, [trips, monthRange]);

  const topOrigins = useMemo<Place[]>(() => {
    const seen = new Map<string, { place: Place; count: number; last: number }>();
    const add = (p: Place | undefined, at: number) => {
      if (!p) return;
      const key = placeKey(p);
      if (key === "?" || key === "#") return;
      const entry = seen.get(key);
      if (entry) {
        entry.count += 1;
        entry.last = Math.max(entry.last, at);
      } else {
        seen.set(key, { place: p, count: 1, last: at });
      }
    };
    for (const t of trips) add(t.from, t.createdAt);
    for (const r of routes) add(r.from, r.lastUsedAt);
    return Array.from(seen.values())
      .sort((a, b) => b.count - a.count || b.last - a.last)
      .slice(0, 3)
      .map((e) => e.place);
  }, [trips, routes]);

  const visibleTiles = showAllTiles ? ranked : ranked.slice(0, MAX_TILES);

  // Always read the sheets' route back from live state so an edit is reflected
  // the next time it opens. Goes null once the route is archived, which is
  // fine — every path that archives closes the sheets first.
  const menuRoute = useMemo(
    () => routes.find((r) => r.id === menuRouteId) ?? null,
    [routes, menuRouteId],
  );

  // ---------------------------------------------------------------------
  // Mutations — optimistic, loud on failure
  // ---------------------------------------------------------------------

  const undoLog = useCallback(
    async ({ trip, prevRoute }: LoggedRef) => {
      dropTrip(trip.id);
      upsertRoute(prevRoute);
      try {
        await softDeleteTrip(trip.id);
        await putRoute({ ...prevRoute, updatedAt: Date.now() });
        uiActions.showSnack("Trip removed", "info");
      } catch (err) {
        uiActions.showError(err, "Couldn't undo that — your trip is still logged.");
        await refresh();
      }
    },
    [dropTrip, upsertRoute, refresh],
  );

  const logFromRoute = useCallback(
    async (route: Route, dateKey: string): Promise<LoggedRef | null> => {
      const trip = buildTripFromRoute(route, dateKey, settings);
      const nextRoute = bumpRoute(route, trip.createdAt);
      upsertTrip(trip);
      upsertRoute(nextRoute);
      try {
        await putTrip(trip);
        await putRoute(nextRoute);
      } catch (err) {
        uiActions.showError(err, SAVE_FAILED);
        await refresh();
        return null;
      }
      return { trip, prevRoute: route };
    },
    [settings, upsertTrip, upsertRoute, refresh],
  );

  const showLogged = useCallback(
    (message: string, logged: LoggedRef, onRoundTrip?: () => void) => {
      uiActions.clear();
      toastSeq.current += 1;
      setToast({
        key: toastSeq.current,
        message,
        onUndo: () => void undoLog(logged),
        onRoundTrip,
      });
    },
    [undoLog],
  );

  const makeRoundTrip = useCallback(
    async (logged: LoggedRef, name: string) => {
      const next: Trip = {
        ...logged.trip,
        distanceMiles: logged.trip.distanceMiles * 2,
        roundTrip: true,
        updatedAt: Date.now(),
      };
      upsertTrip(next);
      try {
        await putTrip(next);
      } catch (err) {
        uiActions.showError(err, "Couldn't make that a round trip.");
        await refresh();
        return;
      }
      showLogged(`Logged ${fmtMiles(next.distanceMiles)} mi — ${name}, round trip`, {
        trip: next,
        prevRoute: logged.prevRoute,
      });
    },
    [upsertTrip, refresh, showLogged],
  );

  const onTileTap = useCallback(
    async (route: Route) => {
      const logged = await logFromRoute(route, today);
      if (!logged) return;

      setPulseId(route.id);
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setPulseId(null), PULSE_MS);

      const name = placeLabel(route.to);
      showLogged(
        `Logged ${fmtMiles(logged.trip.distanceMiles)} mi — ${name}`,
        logged,
        route.defaultRoundTrip ? undefined : () => void makeRoundTrip(logged, name),
      );
    },
    [logFromRoute, today, showLogged, makeRoundTrip],
  );

  const logForDay = useCallback(
    async (route: Route, dateKey: string): Promise<boolean> => {
      const logged = await logFromRoute(route, dateKey);
      if (!logged) return false;
      uiActions.showUndo(
        `Logged ${fmtMiles(logged.trip.distanceMiles)} mi — ${formatKey(dateKey, "short")}`,
        () => void undoLog(logged),
      );
      return true;
    },
    [logFromRoute, undoLog],
  );

  // `route` is null for a multi-leg stop journey: it's a one-off ledger entry,
  // never a repeatable tile, so nothing route-shaped is written or undone.
  const submitNewTrip = useCallback(
    async ({ trip, route, prevRoute }: NewTripPayload): Promise<boolean> => {
      upsertTrip(trip);
      if (route) upsertRoute(route);
      try {
        await putTrip(trip);
        if (route) await putRoute(route);
      } catch (err) {
        uiActions.showError(err, SAVE_FAILED);
        await refresh();
        return false;
      }

      const message = route
        ? `Logged ${fmtMiles(trip.distanceMiles)} mi — saved as a route`
        : `Logged ${fmtMiles(trip.distanceMiles)} mi`;

      uiActions.showUndo(message, () => {
        void (async () => {
          dropTrip(trip.id);
          if (route) {
            if (prevRoute) upsertRoute(prevRoute);
            else dropRoute(route.id);
          }
          try {
            const now = Date.now();
            await softDeleteTrip(trip.id);
            if (route) {
              await putRoute(
                prevRoute ? { ...prevRoute, updatedAt: now } : { ...route, deletedAt: now, updatedAt: now },
              );
            }
            uiActions.showSnack("Trip removed", "info");
          } catch (err) {
            uiActions.showError(err, "Couldn't undo that — your trip is still logged.");
            await refresh();
          }
        })();
      });
      return true;
    },
    [upsertTrip, upsertRoute, dropTrip, dropRoute, refresh],
  );

  const saveRoute = useCallback(
    async (next: Route): Promise<boolean> => {
      upsertRoute(next);
      try {
        await putRoute(next);
        uiActions.showSnack("Route updated", "success");
        return true;
      } catch (err) {
        uiActions.showError(err, "Couldn't save that route.");
        await refresh();
        return false;
      }
    },
    [upsertRoute, refresh],
  );

  const onArchiveRoute = useCallback(
    async (route: Route) => {
      setEditOpen(false);
      setMenuOpen(false);
      dropRoute(route.id);
      try {
        await archiveRoute(route.id);
      } catch (err) {
        uiActions.showError(err, "Couldn't archive that route.");
        await refresh();
        return;
      }
      uiActions.showUndo(`Archived ${placeLabel(route.to)}`, () => {
        void (async () => {
          const restored: Route = { ...route, archived: false, updatedAt: Date.now() };
          upsertRoute(restored);
          try {
            await putRoute(restored);
          } catch (err) {
            uiActions.showError(err, "Couldn't restore that route.");
            await refresh();
          }
        })();
      });
    },
    [dropRoute, upsertRoute, refresh],
  );

  // ---------------------------------------------------------------------
  // Sheet plumbing
  // ---------------------------------------------------------------------

  const openNewTrip = useCallback(
    (dateKey?: string) => {
      clearContinueParam();
      setNewTripDate(dateKey ?? today);
      setNewTripFrom(null);
      setContinuingFrom("");
      setNewTripKey((k) => k + 1);
      setNewTripOpen(true);
    },
    [today],
  );

  /**
   * "Drove to Crozet this morning, carrying on to the work site this
   * afternoon" — the second drive is its own entry starting where the first
   * one ended, on the same day. Two clean records beat one edited one.
   */
  const continueFromTrip = useCallback((trip: Trip) => {
    clearContinueParam();
    setNewTripDate(trip.dateKey);
    setNewTripFrom(trip.to);
    setContinuingFrom(placeLabel(trip.to));
    setNewTripKey((k) => k + 1);
    setNewTripOpen(true);
  }, []);

  // The ledger's quick action hands a trip over by navigating to
  // /?continue=<id>. That param IS the open state for this one case — derived,
  // never copied into local state — so there's no effect racing the ledger
  // load, and closing the sheet strips the param instead of leaving a URL that
  // reopens itself on reload.
  const continueTrip = useMemo(
    () => (ready && continueId ? (trips.find((t) => t.id === continueId) ?? null) : null),
    [ready, continueId, trips],
  );

  // Deleted between screens, or a hand-edited URL: say so and drop the param.
  useEffect(() => {
    if (!ready || !continueId || continueTrip) return;
    uiActions.showSnack("Couldn't find that trip to continue from.", "warning");
    clearContinueParam();
  }, [ready, continueId, continueTrip]);

  const openRouteMenu = useCallback((route: Route) => {
    setMenuRouteId(route.id);
    setMenuOpen(true);
  }, []);

  if (!ready || !today) return <HomeSkeleton />;

  const hasAnything = trips.length > 0 || routes.length > 0;

  return (
    <Box sx={{ px: 2.5, pb: 3 }}>
      <HomeHeader today={today} todayTotals={todayTotals} />

      <Stack spacing={2.5} sx={{ mt: 2 }}>
        {loadError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refresh()}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : null}

        {hasAnything && periodRange ? (
          <PeriodChip
            range={periodRange}
            totals={periodTotals}
            hasSchedule={Boolean(settings.paySchedule)}
          />
        ) : null}

        {suggestions.length > 0 ? (
          <CatchUpBanner count={suggestions.length} onOpen={() => setCatchUpOpen(true)} />
        ) : null}

        {!hasAnything ? (
          <EmptyHero onNewTrip={() => openNewTrip()} />
        ) : ranked.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              px: 2.5,
              py: 4,
              borderRadius: `${radii.card}px`,
              border: "1.5px dashed",
              borderColor: "rgba(124,58,237,0.35)",
            }}
          >
            <AddRoadRoundedIcon sx={{ fontSize: 30, color: "primary.main" }} />
            <Typography variant="h5" sx={{ mt: 1 }}>
              No saved routes yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              Log a trip once and it turns into a one-tap tile.
            </Typography>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openNewTrip()}>
              New trip
            </Button>
          </Box>
        ) : (
          <Box component="section">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1.5,
              }}
            >
              {visibleTiles.map((route) => (
                <RouteTile
                  key={route.id}
                  route={route}
                  usesThisMonth={usesThisMonth.get(route.id) ?? 0}
                  pulsing={pulseId === route.id}
                  onTap={() => void onTileTap(route)}
                  onLongPress={() => openRouteMenu(route)}
                />
              ))}
              <NewTripTile onClick={() => openNewTrip()} />
            </Box>

            {ranked.length > MAX_TILES ? (
              <Button
                fullWidth
                size="small"
                onClick={() => setShowAllTiles((v) => !v)}
                sx={{ mt: 1.25, color: "text.secondary" }}
              >
                {showAllTiles ? "Show fewer" : `Show all ${ranked.length} routes`}
              </Button>
            ) : null}
          </Box>
        )}

        {hasAnything ? (
          <Button
            fullWidth
            size="large"
            variant="outlined"
            component={Link}
            href="/drive"
            startIcon={<NavigationRoundedIcon />}
          >
            Track a drive
          </Button>
        ) : null}

        <InstallCoach compact />

        <RecentTrips trips={trips.slice(0, 3)} today={today} onContinue={continueFromTrip} />
      </Stack>

      <LoggedToast state={toast} onClose={() => setToast(null)} />

      <CatchUpSheet
        open={catchUpOpen}
        onClose={() => setCatchUpOpen(false)}
        suggestions={suggestions}
        onLog={logForDay}
        onAddOther={(dateKey) => {
          setCatchUpOpen(false);
          openNewTrip(dateKey);
        }}
      />

      <NewTripSheet
        key={continueTrip ? `continue-${continueTrip.id}` : newTripKey}
        open={newTripOpen || Boolean(continueTrip)}
        onClose={() => {
          setNewTripOpen(false);
          clearContinueParam();
        }}
        today={today}
        initialDateKey={(continueTrip ? continueTrip.dateKey : newTripDate) || today}
        initialFrom={continueTrip ? continueTrip.to : newTripFrom}
        continuingFrom={continueTrip ? placeLabel(continueTrip.to) : continuingFrom}
        settings={settings}
        routes={routes}
        topOrigins={topOrigins}
        onSubmit={submitNewTrip}
      />

      <RouteMenuSheet
        open={menuOpen}
        route={menuRoute}
        onClose={() => setMenuOpen(false)}
        onLogAnotherDay={() => {
          setMenuOpen(false);
          setDayPickOpen(true);
        }}
        onEdit={() => {
          setMenuOpen(false);
          setEditOpen(true);
        }}
      />

      <DayPickSheet
        open={dayPickOpen}
        onClose={() => setDayPickOpen(false)}
        title="Log for another day"
        subtitle={menuRoute ? placeLabel(menuRoute.to) : undefined}
        today={today}
        onPick={(dateKey) => {
          setDayPickOpen(false);
          if (menuRoute) void logForDay(menuRoute, dateKey);
        }}
      />

      <EditRouteSheet
        open={editOpen}
        route={menuRoute}
        onClose={() => setEditOpen(false)}
        onSave={saveRoute}
        onArchive={(route) => void onArchiveRoute(route)}
      />
    </Box>
  );
}

export default HomeScreen;
