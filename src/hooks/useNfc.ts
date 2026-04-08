"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface NfcPayload {
  app: "rva-miles";
  type: "vehicle";
  vehicleId: string;
  vehicleName?: string;
}

interface UseNfcReturn {
  isSupported: boolean;
  isScanning: boolean;
  lastRead: NfcPayload | null;
  error: string | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
  write: (payload: NfcPayload) => Promise<void>;
  clearLastRead: () => void;
}

function isValidPayload(data: unknown): data is NfcPayload {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.app === "rva-miles" &&
    obj.type === "vehicle" &&
    typeof obj.vehicleId === "string"
  );
}

export function useNfc(): UseNfcReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastRead, setLastRead] = useState<NfcPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readerRef = useRef<NDEFReader | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsSupported("NDEFReader" in window);
  }, []);

  const handleReading = useCallback((event: NDEFReadingEvent) => {
    const { message } = event;
    for (const record of message.records) {
      if (record.recordType === "text" && record.data) {
        const decoder = new TextDecoder(record.encoding || "utf-8");
        const text = decoder.decode(record.data);
        try {
          const parsed = JSON.parse(text);
          if (isValidPayload(parsed)) {
            setLastRead(parsed);
            setError(null);
            return;
          }
        } catch {
          // Not JSON or not our format, skip
        }
      }
    }
    setError("This NFC tag is not programmed for RVA Miles");
  }, []);

  const startScan = useCallback(async () => {
    if (!isSupported) {
      setError("NFC is not supported on this device");
      return;
    }

    try {
      const reader = new NDEFReader();
      const controller = new AbortController();

      readerRef.current = reader;
      abortControllerRef.current = controller;

      reader.addEventListener("reading", handleReading);
      reader.addEventListener("readingerror", () => {
        setError("Could not read NFC tag. Try holding your phone closer.");
      });

      await reader.scan({ signal: controller.signal });
      setIsScanning(true);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start NFC scan";
      if (message.includes("not allowed") || message.includes("permission")) {
        setError("NFC permission denied. Please allow NFC access.");
      } else {
        setError(message);
      }
      setIsScanning(false);
    }
  }, [isSupported, handleReading]);

  const stopScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.removeEventListener("reading", handleReading);
      readerRef.current = null;
    }
    setIsScanning(false);
  }, [handleReading]);

  const write = useCallback(
    async (payload: NfcPayload) => {
      if (!isSupported) {
        throw new Error("NFC is not supported on this device");
      }

      const reader = new NDEFReader();
      const controller = new AbortController();

      // Timeout after 60 seconds
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        await reader.write(
          {
            records: [
              {
                recordType: "text",
                lang: "en",
                data: JSON.stringify(payload),
              },
            ],
          },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeout);
      }
    },
    [isSupported]
  );

  const clearLastRead = useCallback(() => {
    setLastRead(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isSupported,
    isScanning,
    lastRead,
    error,
    startScan,
    stopScan,
    write,
    clearLastRead,
  };
}
