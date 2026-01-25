"use client";

import { useState, useEffect, useCallback } from "react";
import { Trip, Vehicle, GpsPoint } from "@/types";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  getVehicles,
  getActiveTrip,
  saveActiveTrip,
  addTrip,
  updateTrip,
  generateId,
} from "@/lib/storage";
import { calculateTotalDistance, formatDistance, formatDuration } from "@/lib/geo";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";

interface TripTrackerProps {
  onTripComplete?: (trip: Trip) => void;
}

export default function TripTracker({ onTripComplete }: TripTrackerProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [adjustedMiles, setAdjustedMiles] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);

  const {
    currentPosition,
    gpsPoints,
    isTracking,
    error: geoError,
    isSupported: geoSupported,
    startTracking,
    stopTracking,
    clearPoints,
  } = useGeolocation({ trackingInterval: 3000 }); // Record every 3 seconds for city driving

  const {
    isSupported: wakeLockSupported,
    isActive: wakeLockActive,
    request: requestWakeLock,
    release: releaseWakeLock,
    error: wakeLockError,
  } = useWakeLock();

  // Load vehicles and check for active trip on mount
  useEffect(() => {
    const loadedVehicles = getVehicles();
    setVehicles(loadedVehicles);

    const defaultVehicle = loadedVehicles.find((v) => v.isDefault);
    if (defaultVehicle) {
      setSelectedVehicleId(defaultVehicle.id);
    } else if (loadedVehicles.length > 0) {
      setSelectedVehicleId(loadedVehicles[0].id);
    }

    // Check for crashed/interrupted trip
    const savedActiveTrip = getActiveTrip();
    if (savedActiveTrip) {
      setActiveTrip(savedActiveTrip);
    }
  }, []);

  // Update elapsed time while tracking
  useEffect(() => {
    if (!activeTrip) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - activeTrip.startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrip]);

  // Save active trip to localStorage periodically
  useEffect(() => {
    if (activeTrip && isTracking) {
      const updatedTrip: Trip = {
        ...activeTrip,
        gpsPoints: gpsPoints,
        distanceMiles: calculateTotalDistance(gpsPoints),
        endLocation: currentPosition,
        updatedAt: Date.now(),
      };
      saveActiveTrip(updatedTrip);
      setActiveTrip(updatedTrip);
    }
  }, [gpsPoints, currentPosition]);

  const handleStartTrip = useCallback(async () => {
    if (!selectedVehicleId) {
      alert("Please select a vehicle first");
      return;
    }

    if (!geoSupported) {
      alert("Geolocation is not supported on this device");
      return;
    }

    // Request wake lock for iOS
    if (wakeLockSupported) {
      await requestWakeLock();
    }

    clearPoints();
    startTracking();

    // Wait a moment for the first position
    setTimeout(() => {
      const startLocation: GpsPoint = currentPosition || {
        lat: 0,
        lng: 0,
        timestamp: Date.now(),
      };

      const newTrip: Trip = {
        id: generateId(),
        vehicleId: selectedVehicleId,
        startTime: Date.now(),
        endTime: null,
        startLocation,
        endLocation: null,
        gpsPoints: [],
        distanceMiles: 0,
        purpose: "",
        status: "in-progress",
        isManualEntry: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setActiveTrip(newTrip);
      saveActiveTrip(newTrip);
    }, 1000);
  }, [
    selectedVehicleId,
    geoSupported,
    wakeLockSupported,
    requestWakeLock,
    clearPoints,
    startTracking,
    currentPosition,
  ]);

  const handleStopTrip = useCallback(() => {
    setShowStopModal(true);
    const currentMiles = calculateTotalDistance(gpsPoints);
    setAdjustedMiles(currentMiles.toFixed(2));
  }, [gpsPoints]);

  const handleConfirmStop = useCallback(() => {
    if (!activeTrip) return;

    const finalPoints = stopTracking();
    releaseWakeLock();

    const finalMiles = parseFloat(adjustedMiles) || calculateTotalDistance(finalPoints);

    const completedTrip: Trip = {
      ...activeTrip,
      endTime: Date.now(),
      endLocation: currentPosition || finalPoints[finalPoints.length - 1] || null,
      gpsPoints: finalPoints,
      distanceMiles: finalMiles,
      purpose: purpose.trim(),
      status: "completed",
      updatedAt: Date.now(),
    };

    // Save to trips list and clear active trip
    addTrip(completedTrip);
    saveActiveTrip(null);

    setActiveTrip(null);
    setShowStopModal(false);
    setPurpose("");
    setAdjustedMiles("");
    setElapsedTime(0);

    onTripComplete?.(completedTrip);
  }, [
    activeTrip,
    stopTracking,
    releaseWakeLock,
    adjustedMiles,
    currentPosition,
    purpose,
    onTripComplete,
  ]);

  const handleCancelStop = useCallback(() => {
    setShowStopModal(false);
    setPurpose("");
    setAdjustedMiles("");
  }, []);

  const handleResumeTrip = useCallback(() => {
    if (wakeLockSupported) {
      requestWakeLock();
    }
    startTracking();
  }, [wakeLockSupported, requestWakeLock, startTracking]);

  const handleDiscardTrip = useCallback(() => {
    if (confirm("Are you sure you want to discard this trip?")) {
      stopTracking();
      releaseWakeLock();
      saveActiveTrip(null);
      setActiveTrip(null);
      setElapsedTime(0);
    }
  }, [stopTracking, releaseWakeLock]);

  const currentDistance = calculateTotalDistance(gpsPoints);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Render active trip UI
  if (activeTrip) {
    return (
      <div className="space-y-4">
        {/* iOS Warning */}
        {wakeLockSupported && !wakeLockActive && (
          <Card className="bg-yellow-900/50 border-yellow-700">
            <p className="text-yellow-200 text-sm">
              Keep screen active to ensure GPS tracking. Plug in your phone if needed.
            </p>
          </Card>
        )}

        {/* GPS Error */}
        {geoError && (
          <Card className="bg-red-900/50 border-red-700">
            <p className="text-red-200 text-sm">{geoError}</p>
          </Card>
        )}

        {/* Active Trip Card */}
        <Card variant="elevated" className="text-center">
          <div className="mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Trip In Progress
            </span>
          </div>

          <div className="py-6">
            <div className="text-5xl font-bold text-white mb-2">
              {formatDistance(currentDistance)}
            </div>
            <div className="text-slate-400 text-lg">
              {formatDuration(activeTrip.startTime, null)}
            </div>
          </div>

          <div className="text-sm text-slate-400 mb-4">
            {selectedVehicle?.name || "Unknown Vehicle"}
          </div>

          {currentPosition && (
            <div className="text-xs text-slate-500 mb-4">
              {gpsPoints.length} GPS points recorded
              {currentPosition.accuracy && (
                <span className="ml-2">
                  (accuracy: {Math.round(currentPosition.accuracy)}m)
                </span>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={handleStopTrip}
            >
              Stop Trip
            </Button>
          </div>

          <button
            onClick={handleDiscardTrip}
            className="mt-4 text-sm text-slate-500 hover:text-slate-300"
          >
            Discard Trip
          </button>
        </Card>

        {/* Stop Trip Modal */}
        {showStopModal && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">
                Complete Trip
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">GPS Distance</p>
                  <p className="text-2xl font-bold text-white">
                    {formatDistance(currentDistance)}
                  </p>
                </div>

                <Input
                  label="Adjust Miles (if GPS was inaccurate)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={adjustedMiles}
                  onChange={(e) => setAdjustedMiles(e.target.value)}
                  placeholder={currentDistance.toFixed(2)}
                />

                <Input
                  label="Trip Purpose (optional)"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Client meeting, Site visit"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleCancelStop}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleConfirmStop}
                >
                  Save Trip
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Render start trip UI
  return (
    <Card variant="elevated" className="text-center">
      <h2 className="text-xl font-semibold text-white mb-6">Start a Trip</h2>

      <div className="mb-6">
        <Select
          label="Select Vehicle"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          options={vehicles.map((v) => ({
            value: v.id,
            label: v.name,
          }))}
        />
      </div>

      {geoError && (
        <p className="text-red-400 text-sm mb-4">{geoError}</p>
      )}

      {!geoSupported && (
        <p className="text-yellow-400 text-sm mb-4">
          Geolocation is not supported on this device. You can still add trips manually.
        </p>
      )}

      <Button
        size="xl"
        className="w-full"
        onClick={handleStartTrip}
        disabled={!selectedVehicleId || !geoSupported}
      >
        Start Trip
      </Button>

      {wakeLockSupported === false && (
        <p className="text-yellow-400 text-xs mt-4">
          Screen Wake Lock not supported. Keep your screen on manually during trips.
        </p>
      )}
    </Card>
  );
}
