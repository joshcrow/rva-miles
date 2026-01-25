"use client";

import { useState, useEffect } from "react";
import { Vehicle } from "@/types";
import {
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  generateId,
} from "@/lib/storage";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

interface VehicleManagerProps {
  onClose?: () => void;
}

export default function VehicleManager({ onClose }: VehicleManagerProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    setVehicles(getVehicles());
  }, []);

  const resetForm = () => {
    setName("");
    setMake("");
    setModel("");
    setYear("");
    setIsDefault(false);
    setEditingVehicle(null);
    setShowForm(false);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setName(vehicle.name);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(vehicle.year.toString());
    setIsDefault(vehicle.isDefault);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (vehicles.length === 1) {
      alert("You must have at least one vehicle");
      return;
    }
    if (confirm("Are you sure you want to delete this vehicle?")) {
      const updatedVehicles = deleteVehicle(id);
      setVehicles(updatedVehicles);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a vehicle name");
      return;
    }

    const vehicleData: Vehicle = {
      id: editingVehicle?.id || generateId(),
      name: name.trim(),
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year) || new Date().getFullYear(),
      isDefault: isDefault || vehicles.length === 0,
      createdAt: editingVehicle?.createdAt || Date.now(),
    };

    let updatedVehicles: Vehicle[];
    if (editingVehicle) {
      updatedVehicles = updateVehicle(vehicleData);
    } else {
      updatedVehicles = addVehicle(vehicleData);
    }

    setVehicles(updatedVehicles);
    resetForm();
  };

  const handleSetDefault = (vehicle: Vehicle) => {
    const updated = { ...vehicle, isDefault: true };
    const updatedVehicles = updateVehicle(updated);
    setVehicles(updatedVehicles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Vehicles</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Vehicle List */}
      <div className="space-y-2">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{vehicle.name}</span>
                {vehicle.isDefault && (
                  <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!vehicle.isDefault && (
                <button
                  onClick={() => handleSetDefault(vehicle)}
                  className="text-xs text-slate-400 hover:text-blue-400"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => handleEdit(vehicle)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(vehicle.id)}
                className="p-2 text-slate-400 hover:text-red-400"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm ? (
        <Card>
          <h3 className="font-medium text-white mb-4">
            {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2014 Subaru Outback"
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2014"
              />
              <Input
                label="Make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Subaru"
              />
              <Input
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Outback"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Set as default vehicle</span>
            </label>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                {editingVehicle ? "Save" : "Add Vehicle"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          + Add Vehicle
        </Button>
      )}
    </div>
  );
}
