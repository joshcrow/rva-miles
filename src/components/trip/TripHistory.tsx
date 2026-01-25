"use client";

import { useState, useEffect } from "react";
import { Trip, Vehicle } from "@/types";
import { getTrips, getVehicles, deleteTrip } from "@/lib/storage";
import { formatDistance, formatDuration } from "@/lib/geo";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface TripHistoryProps {
  onEditTrip?: (trip: Trip) => void;
  refreshKey?: number;
}

export default function TripHistory({ onEditTrip, refreshKey }: TripHistoryProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  useEffect(() => {
    setTrips(getTrips());
    setVehicles(getVehicles());
  }, [refreshKey]);

  const getVehicleName = (vehicleId: string): string => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.name || "Unknown Vehicle";
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleDelete = (tripId: string) => {
    if (confirm("Are you sure you want to delete this trip?")) {
      const updatedTrips = deleteTrip(tripId);
      setTrips(updatedTrips);
    }
  };

  const toggleExpand = (tripId: string) => {
    setExpandedTripId(expandedTripId === tripId ? null : tripId);
  };

  // Group trips by date
  const groupedTrips = trips.reduce((groups, trip) => {
    const date = formatDate(trip.startTime);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(trip);
    return groups;
  }, {} as Record<string, Trip[]>);

  if (trips.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-slate-400">No trips recorded yet.</p>
        <p className="text-slate-500 text-sm mt-2">
          Start a trip above to begin tracking your mileage.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTrips).map(([date, dayTrips]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-slate-400 mb-2 px-1">
            {date}
          </h3>
          <div className="space-y-2">
            {dayTrips.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:bg-slate-750 transition-colors"
                onClick={() => toggleExpand(trip.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">
                        {formatDistance(trip.distanceMiles)}
                      </span>
                      {trip.isManualEntry && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {formatTime(trip.startTime)}
                      {trip.endTime && (
                        <>
                          {" - "}
                          {formatTime(trip.endTime)}
                          <span className="text-slate-500 ml-2">
                            ({formatDuration(trip.startTime, trip.endTime)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">
                      {getVehicleName(trip.vehicleId)}
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-500 mt-1 transition-transform ${
                        expandedTripId === trip.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTripId === trip.id && (
                  <div
                    className="mt-4 pt-4 border-t border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {trip.purpose && (
                      <div className="mb-3">
                        <span className="text-xs text-slate-500">Purpose</span>
                        <p className="text-slate-300">{trip.purpose}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-xs text-slate-500">Start</span>
                        <p className="text-slate-300">
                          {trip.startLocation.lat.toFixed(4)},{" "}
                          {trip.startLocation.lng.toFixed(4)}
                        </p>
                      </div>
                      {trip.endLocation && (
                        <div>
                          <span className="text-xs text-slate-500">End</span>
                          <p className="text-slate-300">
                            {trip.endLocation.lat.toFixed(4)},{" "}
                            {trip.endLocation.lng.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mb-4">
                      {trip.gpsPoints.length} GPS points recorded
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTrip?.(trip)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(trip.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
