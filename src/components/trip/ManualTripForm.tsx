"use client";

import { useState, useEffect } from "react";
import { Trip, Vehicle } from "@/types";
import { getVehicles, addTrip, updateTrip, generateId } from "@/lib/storage";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface ManualTripFormProps {
  trip?: Trip | null; // If provided, we're editing
  onClose: () => void;
  onSave: (trip: Trip) => void;
}

export default function ManualTripForm({
  trip,
  onClose,
  onSave,
}: ManualTripFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [distance, setDistance] = useState("");
  const [purpose, setPurpose] = useState("");

  const isEditing = !!trip;

  useEffect(() => {
    const loadedVehicles = getVehicles();
    setVehicles(loadedVehicles);

    if (trip) {
      // Populate form with existing trip data
      setVehicleId(trip.vehicleId);
      setDate(new Date(trip.startTime).toISOString().split("T")[0]);
      setStartTime(
        new Date(trip.startTime).toTimeString().slice(0, 5)
      );
      if (trip.endTime) {
        setEndTime(new Date(trip.endTime).toTimeString().slice(0, 5));
      }
      setDistance(trip.distanceMiles.toString());
      setPurpose(trip.purpose);
    } else {
      // Set defaults for new trip
      const defaultVehicle = loadedVehicles.find((v) => v.isDefault);
      if (defaultVehicle) {
        setVehicleId(defaultVehicle.id);
      }
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [trip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !date || !distance) {
      alert("Please fill in all required fields");
      return;
    }

    const distanceMiles = parseFloat(distance);
    if (isNaN(distanceMiles) || distanceMiles < 0) {
      alert("Please enter a valid distance");
      return;
    }

    // Create timestamps from date and time inputs
    const startDateTime = new Date(`${date}T${startTime || "09:00"}`);
    const endDateTime = endTime
      ? new Date(`${date}T${endTime}`)
      : new Date(startDateTime.getTime() + 30 * 60000); // Default 30 min trip

    const tripData: Trip = {
      id: trip?.id || generateId(),
      vehicleId,
      startTime: startDateTime.getTime(),
      endTime: endDateTime.getTime(),
      startLocation: trip?.startLocation || { lat: 0, lng: 0, timestamp: startDateTime.getTime() },
      endLocation: trip?.endLocation || { lat: 0, lng: 0, timestamp: endDateTime.getTime() },
      gpsPoints: trip?.gpsPoints || [],
      distanceMiles,
      purpose: purpose.trim(),
      status: "completed",
      isManualEntry: !trip || trip.isManualEntry,
      createdAt: trip?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (isEditing) {
      updateTrip(tripData);
    } else {
      addTrip(tripData);
    }

    onSave(tripData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">
          {isEditing ? "Edit Trip" : "Add Manual Trip"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={vehicles.map((v) => ({
              value: v.id,
              label: v.name,
            }))}
          />

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Input
            label="Distance (miles)"
            type="number"
            step="0.1"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="e.g., 12.5"
            required
          />

          <Input
            label="Purpose (optional)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Client meeting"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {isEditing ? "Save Changes" : "Add Trip"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
