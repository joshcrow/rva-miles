"use client";

// The full trip ledger. Default view is scoped to one month (sticky header
// with a month navigator + that month's totals); typing in search widens the
// view to every trip, ever, filtered client-side. Every mutation here is
// optimistic with an instant undo snackbar — no confirmation dialogs.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Trip } from "@/types";
import { putTrip, softDeleteTrip, undeleteTrip } from "@/lib/db";
import { uiActions } from "@/stores/ui";
import EditTripSheet from "./EditTripSheet";
import EmptyTripsState from "./EmptyTripsState";
import MonthHeader from "./MonthHeader";
import QuickActionsSheet from "./QuickActionsSheet";
import TripList from "./TripList";
import TripsSkeleton from "./TripsSkeleton";
import { fmtMiles, placeLabel, totalsOf } from "./format";
import { monthKeyOf, monthLabel, shiftMonth } from "./monthNav";
import { filterTrips } from "./search";
import { buildRepeatTrip } from "./tripEdits";
import { useTripsData } from "./useTripsData";

export function TripsScreen() {
  const {
    ready,
    loadError,
    today,
    settings,
    monthKey,
    monthTrips,
    monthLoading,
    goToMonth,
    allTrips,
    ensureAllTripsLoaded,
    refresh,
    upsertTrip,
    dropTrip,
  } = useTripsData();

  const [searchQuery, setSearchQuery] = useState("");
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [quickTrip, setQuickTrip] = useState<Trip | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const searching = searchQuery.trim().length > 0;

  // A month with nothing logged is ambiguous (empty month vs. brand-new
  // user) until we've confirmed the full ledger — load it lazily, cached,
  // rather than fetching the whole ledger on every default month view.
  useEffect(() => {
    if (!ready) return;
    if (searching || monthTrips.length === 0) ensureAllTripsLoaded();
  }, [ready, searching, monthTrips.length, ensureAllTripsLoaded]);

  const monthTotals = useMemo(() => totalsOf(monthTrips), [monthTrips]);

  const visibleTrips = useMemo(
    () => (searching ? filterTrips(allTrips ?? [], searchQuery) : monthTrips),
    [searching, allTrips, searchQuery, monthTrips],
  );

  const openEdit = useCallback((trip: Trip) => {
    setEditTrip(trip);
    setEditOpen(true);
  }, []);

  const openQuick = useCallback((trip: Trip) => {
    setQuickTrip(trip);
    setQuickOpen(true);
  }, []);

  const saveTrip = useCallback(
    async (next: Trip): Promise<boolean> => {
      upsertTrip(next);
      try {
        await putTrip(next);
        uiActions.showSnack("Trip updated", "success");
        return true;
      } catch (err) {
        uiActions.showError(err, "Couldn't save that trip.");
        await refresh();
        return false;
      }
    },
    [upsertTrip, refresh],
  );

  const deleteTrip = useCallback(
    (trip: Trip) => {
      setEditOpen(false);
      setQuickOpen(false);
      dropTrip(trip.id);
      void (async () => {
        try {
          await softDeleteTrip(trip.id);
        } catch (err) {
          uiActions.showError(err, "Couldn't delete that trip.");
          await refresh();
          return;
        }
        uiActions.showUndo(`Deleted ${placeLabel(trip.to)} trip`, () => {
          void (async () => {
            upsertTrip(trip);
            try {
              await undeleteTrip(trip.id);
              uiActions.showSnack("Trip restored", "success");
            } catch (err) {
              uiActions.showError(err, "Couldn't restore that trip.");
              await refresh();
            }
          })();
        });
      })();
    },
    [dropTrip, upsertTrip, refresh],
  );

  const repeatTrip = useCallback(
    (trip: Trip) => {
      setQuickOpen(false);
      const clone = buildRepeatTrip(trip, today, settings.ratePerMile, Date.now());
      upsertTrip(clone);
      void (async () => {
        try {
          await putTrip(clone);
        } catch (err) {
          dropTrip(clone.id);
          uiActions.showError(err, "Couldn't log that trip.");
          return;
        }
        uiActions.showUndo(`Logged ${fmtMiles(clone.distanceMiles)} mi today`, () => {
          void (async () => {
            dropTrip(clone.id);
            try {
              await softDeleteTrip(clone.id);
              uiActions.showSnack("Trip removed", "info");
            } catch (err) {
              uiActions.showError(err, "Couldn't undo that — your trip is still logged.");
              await refresh();
            }
          })();
        });
      })();
    },
    [today, settings.ratePerMile, upsertTrip, dropTrip, refresh],
  );

  if (!ready || !today) return <TripsSkeleton />;

  const confirmedLedgerEmpty = !searching && allTrips !== null && allTrips.length === 0;
  const showSearchLoading = searching && allTrips === null;

  let emptyState: ReactNode;
  if (searching) {
    emptyState = <EmptyTripsState variant="search" onClearSearch={() => setSearchQuery("")} />;
  } else if (confirmedLedgerEmpty) {
    emptyState = <EmptyTripsState variant="none" />;
  } else {
    emptyState = <EmptyTripsState variant="month" monthLabel={monthLabel(monthKey)} />;
  }

  return (
    <Box>
      <MonthHeader
        monthKey={monthKey}
        monthTotals={monthTotals}
        monthLoading={monthLoading}
        today={today}
        onPrevMonth={() => goToMonth(shiftMonth(monthKey, -1))}
        onNextMonth={() => goToMonth(shiftMonth(monthKey, 1))}
        onJumpToday={() => goToMonth(monthKeyOf(today))}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <Box sx={{ px: 2.5, pt: 2, pb: 3 }}>
        {loadError ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void refresh()}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : null}

        {showSearchLoading ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Searching your trips…
            </Typography>
          </Stack>
        ) : (
          <TripList
            trips={visibleTrips}
            today={today}
            emptyState={emptyState}
            onEditTrip={openEdit}
            onQuickActions={openQuick}
            onRepeat={repeatTrip}
            onDelete={deleteTrip}
          />
        )}
      </Box>

      <EditTripSheet
        open={editOpen}
        trip={editTrip}
        today={today}
        settings={settings}
        onClose={() => setEditOpen(false)}
        onSave={saveTrip}
        onDelete={deleteTrip}
      />

      <QuickActionsSheet
        open={quickOpen}
        trip={quickTrip}
        onClose={() => setQuickOpen(false)}
        onRepeat={() => quickTrip && repeatTrip(quickTrip)}
        onDelete={() => quickTrip && deleteTrip(quickTrip)}
      />
    </Box>
  );
}

export default TripsScreen;
