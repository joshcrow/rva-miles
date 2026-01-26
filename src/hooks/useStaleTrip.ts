"use client";

import { useEffect, useState } from "react";
import { getTrips, deleteTrip } from "@/lib/storage";
import { Trip } from "@/types";

const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

export function useStaleTrip() {
  const [staleTrip, setStaleTrip] = useState<Trip | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const trips = getTrips();
    const now = Date.now();
    
    // Find active trips (no end time) that are older than 24 hours
    const stale = trips.find(
      (trip) => !trip.endTime && now - trip.startTime > STALE_THRESHOLD
    );

    if (stale) {
      setStaleTrip(stale);
      setShowDialog(true);
    }
  }, []);

  const handleDiscard = () => {
    if (staleTrip) {
      deleteTrip(staleTrip.id);
      setStaleTrip(null);
      setShowDialog(false);
    }
  };

  const handleKeep = () => {
    setStaleTrip(null);
    setShowDialog(false);
  };

  return {
    staleTrip,
    showDialog,
    handleDiscard,
    handleKeep,
  };
}
