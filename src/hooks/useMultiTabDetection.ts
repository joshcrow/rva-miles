"use client";

import { useEffect, useState } from "react";

const TRACKING_KEY = "rva-miles-active-tracking";

export function useMultiTabDetection() {
  const [conflictDetected, setConflictDetected] = useState(false);
  const [conflictTabId, setConflictTabId] = useState<string>("");

  useEffect(() => {
    const tabId = `tab-${Date.now()}-${Math.random()}`;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TRACKING_KEY && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.tabId !== tabId && data.isTracking) {
          setConflictDetected(true);
          setConflictTabId(data.tabId);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const notifyTracking = (isTracking: boolean) => {
    const tabId = `tab-${Date.now()}-${Math.random()}`;
    localStorage.setItem(
      TRACKING_KEY,
      JSON.stringify({ tabId, isTracking, timestamp: Date.now() })
    );
  };

  const dismissConflict = () => {
    setConflictDetected(false);
  };

  return {
    conflictDetected,
    conflictTabId,
    notifyTracking,
    dismissConflict,
  };
}
