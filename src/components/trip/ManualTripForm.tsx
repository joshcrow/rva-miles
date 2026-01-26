"use client";

import { useState, useEffect } from "react";
import { Trip, Vehicle, GpsPoint, TripCategory, SavedPlace } from "@/types";
import { getVehicles, addTrip, updateTrip, generateId, getTripCategories, getSavedPlaces } from "@/lib/storage";
import { calculateRoute } from "@/lib/googleMaps";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";

interface ManualTripFormProps {
  trip?: Trip | null;
  onClose: () => void;
  onSave: (trip?: Trip) => void;
  bulkMode?: boolean;
}

export default function ManualTripForm({
  trip,
  onClose,
  onSave,
  bulkMode = false,
}: ManualTripFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<TripCategory[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [distance, setDistance] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("");
  
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [startLocation, setStartLocation] = useState<GpsPoint | null>(null);
  const [endLocation, setEndLocation] = useState<GpsPoint | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string>("");
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string>("");
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState(false);
  const [createReturnTrip, setCreateReturnTrip] = useState(false);
  
  const { isOnline } = useOnlineStatus();
  const isEditing = !!trip;

  useEffect(() => {
    const loadedVehicles = getVehicles();
    const loadedCategories = getTripCategories();
    const loadedPlaces = getSavedPlaces();
    setVehicles(loadedVehicles);
    setCategories(loadedCategories);
    setSavedPlaces(loadedPlaces);

    if (trip) {
      setVehicleId(trip.vehicleId);
      setDate(new Date(trip.startTime).toISOString().split("T")[0]);
      setStartTime(new Date(trip.startTime).toTimeString().slice(0, 5));
      if (trip.endTime) {
        setEndTime(new Date(trip.endTime).toTimeString().slice(0, 5));
      }
      setDistance(trip.distanceMiles.toString());
      setPurpose(trip.purpose);
      setCategory(trip.category || "");
      setStartAddress(trip.startAddress || "");
      setEndAddress(trip.endAddress || "");
      if (trip.routePolyline) {
        setRoutePolyline(trip.routePolyline);
        setHasCalculatedRoute(true);
      }
    } else {
      const defaultVehicle = loadedVehicles.find((v) => v.isDefault);
      if (defaultVehicle) {
        setVehicleId(defaultVehicle.id);
      }
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [trip]);

  const handleCalculateRoute = async () => {
    if (!startLocation || !endLocation) {
      setRouteError("Please select both start and end locations");
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError("");

    try {
      const result = await calculateRoute(
        { lat: startLocation.lat, lng: startLocation.lng },
        { lat: endLocation.lat, lng: endLocation.lng }
      );

      if (result) {
        if (result.distance < 0.1) {
          setRouteError("Start and end are too close. Minimum 0.1 miles.");
          setIsCalculatingRoute(false);
          return;
        }
        setDistance(result.distance.toFixed(2));
        setRoutePolyline(result.polyline);
        setStartAddress(result.startAddress);
        setEndAddress(result.endAddress);
        setHasCalculatedRoute(true);
      } else {
        setRouteError("Unable to calculate route. Please enter distance manually.");
      }
    } catch (error) {
      setRouteError("Route calculation failed. Please try again or enter distance manually.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleLocationChange = () => {
    setHasCalculatedRoute(false);
    setRoutePolyline("");
    setDistance("");
    setRouteError("");
  };

  const handleUseSavedPlace = (placeId: string, isStart: boolean) => {
    const place = savedPlaces.find(p => p.id === placeId);
    if (place) {
      if (isStart) {
        setStartAddress(place.address);
        setStartLocation(place.location);
      } else {
        setEndAddress(place.address);
        setEndLocation(place.location);
      }
      handleLocationChange();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !date) {
      alert("Please fill in all required fields");
      return;
    }

    if (!distance || parseFloat(distance) <= 0) {
      alert("Please calculate route or enter distance manually");
      return;
    }

    const distanceMiles = parseFloat(distance);
    const startDateTime = new Date(`${date}T${startTime || "09:00"}`);
    const endDateTime = endTime
      ? new Date(`${date}T${endTime}`)
      : new Date(startDateTime.getTime() + 30 * 60000);

    const tripData: Trip = {
      id: trip?.id || generateId(),
      vehicleId,
      startTime: startDateTime.getTime(),
      endTime: endDateTime.getTime(),
      startLocation: startLocation || trip?.startLocation || { lat: 0, lng: 0, timestamp: startDateTime.getTime() },
      endLocation: endLocation || trip?.endLocation || { lat: 0, lng: 0, timestamp: endDateTime.getTime() },
      gpsPoints: trip?.gpsPoints || [],
      distanceMiles,
      purpose: purpose.trim(),
      status: "completed",
      isManualEntry: true,
      createdAt: trip?.createdAt || Date.now(),
      updatedAt: Date.now(),
      routePolyline: routePolyline || trip?.routePolyline,
      startAddress: startAddress || trip?.startAddress,
      endAddress: endAddress || trip?.endAddress,
      estimatedRoute: hasCalculatedRoute,
      category: category || undefined,
    };

    if (isEditing) {
      updateTrip(tripData);
    } else {
      addTrip(tripData);
    }

    if (createReturnTrip && !isEditing) {
      const returnTrip: Trip = {
        ...tripData,
        id: generateId(),
        startTime: endDateTime.getTime() + 30 * 60000,
        endTime: endDateTime.getTime() + 60 * 60000,
        startLocation: tripData.endLocation!,
        endLocation: tripData.startLocation,
        startAddress: tripData.endAddress,
        endAddress: tripData.startAddress,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addTrip(returnTrip);
    }

    if (bulkMode) {
      setStartAddress('');
      setEndAddress('');
      setStartLocation(null);
      setEndLocation(null);
      setDistance('');
      setPurpose('');
      setRoutePolyline('');
      setHasCalculatedRoute(false);
      setRouteError('');
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    }

    onSave(tripData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">
          {bulkMode ? "Bulk Entry Mode" : isEditing ? "Edit Trip" : "Add Manual Trip"}
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

          {!isOnline && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-sm text-yellow-400">⚠️ Offline - Route calculation unavailable. Enter distance manually.</p>
            </div>
          )}

          <div>
            <LocationAutocomplete
              label="Start Location"
              value={startAddress}
              onChange={(val) => {
                setStartAddress(val);
                handleLocationChange();
              }}
              onValidSelection={(loc, addr) => {
                setStartLocation(loc);
                setStartAddress(addr);
                handleLocationChange();
              }}
              placeholder="Enter start address..."
              disabled={!isOnline}
            />
            {savedPlaces.length > 0 && (
              <div className="mt-2">
                <Select
                  label="Or use saved place"
                  value=""
                  onChange={(e) => handleUseSavedPlace(e.target.value, true)}
                  options={[
                    { value: "", label: "Select saved place..." },
                    ...savedPlaces.map((p) => ({ value: p.id, label: p.name }))
                  ]}
                />
              </div>
            )}
          </div>

          <div>
            <LocationAutocomplete
              label="End Location"
              value={endAddress}
              onChange={(val) => {
                setEndAddress(val);
                handleLocationChange();
              }}
              onValidSelection={(loc, addr) => {
                setEndLocation(loc);
                setEndAddress(addr);
                handleLocationChange();
              }}
              placeholder="Enter end address..."
              disabled={!isOnline}
            />
            {savedPlaces.length > 0 && (
              <div className="mt-2">
                <Select
                  label="Or use saved place"
                  value=""
                  onChange={(e) => handleUseSavedPlace(e.target.value, false)}
                  options={[
                    { value: "", label: "Select saved place..." },
                    ...savedPlaces.map((p) => ({ value: p.id, label: p.name }))
                  ]}
                />
              </div>
            )}
          </div>

          {startLocation && endLocation && !hasCalculatedRoute && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleCalculateRoute}
              disabled={isCalculatingRoute || !isOnline}
              className="w-full"
            >
              {isCalculatingRoute ? "Calculating..." : "Calculate Route"}
            </Button>
          )}

          {hasCalculatedRoute && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
              <p className="text-sm text-green-400">✓ Route calculated: {startAddress} → {endAddress} ({distance} miles)</p>
            </div>
          )}

          {routeError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-400">{routeError}</p>
            </div>
          )}

          <Input
            label="Distance (miles)"
            type="number"
            step="0.1"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="e.g., 12.5"
            required
            disabled={hasCalculatedRoute && !routeError}
          />

          <Select
            label="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: "None" },
              ...categories.map((c) => ({ value: c.name, label: c.name }))
            ]}
          />

          <Input
            label="Purpose (optional)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Client meeting"
          />

          {!isEditing && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={createReturnTrip}
                onChange={(e) => setCreateReturnTrip(e.target.checked)}
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded"
              />
              <span className="text-sm text-slate-200">Create return trip</span>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              {bulkMode ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {bulkMode ? "Save & Next" : isEditing ? "Save Changes" : "Add Trip"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
