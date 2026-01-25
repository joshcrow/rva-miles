"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GpsPoint } from "@/types";

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  trackingInterval?: number; // How often to record points in ms
}

interface UseGeolocationReturn {
  currentPosition: GpsPoint | null;
  gpsPoints: GpsPoint[];
  isTracking: boolean;
  error: string | null;
  isSupported: boolean;
  startTracking: () => void;
  stopTracking: () => GpsPoint[];
  clearPoints: () => void;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  trackingInterval: 5000, // Record every 5 seconds
};

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastRecordedTimeRef = useRef<number>(0);

  useEffect(() => {
    setIsSupported("geolocation" in navigator);
  }, []);

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const point: GpsPoint = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      };

      setCurrentPosition(point);
      setError(null);

      // Only record point if enough time has passed
      const now = Date.now();
      if (now - lastRecordedTimeRef.current >= (opts.trackingInterval || 5000)) {
        setGpsPoints((prev) => [...prev, point]);
        lastRecordedTimeRef.current = now;
      }
    },
    [opts.trackingInterval]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage: string;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location permission denied. Please enable location access.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable.";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out.";
        break;
      default:
        errorMessage = "An unknown error occurred while getting location.";
    }
    setError(errorMessage);
  }, []);

  const startTracking = useCallback(() => {
    if (!isSupported) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    setIsTracking(true);
    setError(null);
    lastRecordedTimeRef.current = 0; // Reset to record first point immediately

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  }, [isSupported, handleSuccess, handleError, opts]);

  const stopTracking = useCallback((): GpsPoint[] => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);

    // Return the collected points
    return gpsPoints;
  }, [gpsPoints]);

  const clearPoints = useCallback(() => {
    setGpsPoints([]);
    lastRecordedTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    currentPosition,
    gpsPoints,
    isTracking,
    error,
    isSupported,
    startTracking,
    stopTracking,
    clearPoints,
  };
}

/**
 * Get a single position (one-shot)
 */
export function getCurrentPosition(): Promise<GpsPoint> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
