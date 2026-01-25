"use client";

import { useState, useEffect, useCallback } from "react";

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
  error: string | null;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported("wakeLock" in navigator);
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) {
      setError("Wake Lock API not supported on this device");
      return;
    }

    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
      setIsActive(true);
      setError(null);

      lock.addEventListener("release", () => {
        setIsActive(false);
        setWakeLock(null);
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to request wake lock";
      setError(errorMessage);
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to release wake lock";
        setError(errorMessage);
      }
    }
  }, [wakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && wakeLock === null && isActive) {
        await request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wakeLock, isActive, request]);

  return {
    isSupported,
    isActive,
    request,
    release,
    error,
  };
}
