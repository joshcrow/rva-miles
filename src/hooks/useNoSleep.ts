"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import NoSleep from "nosleep.js";

interface UseNoSleepReturn {
  isEnabled: boolean;
  isSupported: boolean;
  enable: () => Promise<void>;
  disable: () => void;
  error: string | null;
}

export function useNoSleep(): UseNoSleepReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noSleepRef = useRef<NoSleep | null>(null);

  useEffect(() => {
    // NoSleep.js works on most mobile browsers
    setIsSupported(typeof window !== "undefined" && "document" in window);
    noSleepRef.current = new NoSleep();

    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  const enable = useCallback(async () => {
    if (!noSleepRef.current) return;

    try {
      await noSleepRef.current.enable();
      setIsEnabled(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to enable NoSleep";
      setError(message);
      setIsEnabled(false);
    }
  }, []);

  const disable = useCallback(() => {
    if (!noSleepRef.current) return;

    noSleepRef.current.disable();
    setIsEnabled(false);
  }, []);

  return {
    isEnabled,
    isSupported,
    enable,
    disable,
    error,
  };
}
