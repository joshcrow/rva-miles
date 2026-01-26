"use client";

import { useState, useEffect } from "react";
import { SavedPlace, GpsPoint } from "@/types";
import { getSavedPlaces, addSavedPlace, updateSavedPlace, deleteSavedPlace, generateId, getTripTemplates } from "@/lib/storage";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function SavedPlaceManager() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<GpsPoint | null>(null);
  const [category, setCategory] = useState("");
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = () => {
    setPlaces(getSavedPlaces());
  };

  const handleSave = () => {
    if (!name.trim() || !address.trim() || !location) {
      alert("Please fill in all fields and select a valid location");
      return;
    }

    const existingPlace = places.find(p => p.name === name.trim() && p.id !== editingId);
    if (existingPlace) {
      if (!confirm(`A place named '${name}' already exists. Overwrite?`)) {
        return;
      }
      deleteSavedPlace(existingPlace.id);
    }

    const placeData: SavedPlace = {
      id: editingId || generateId(),
      name: name.trim(),
      address: address.trim(),
      location,
      category: category.trim() || undefined,
      createdAt: editingId ? places.find(p => p.id === editingId)?.createdAt || Date.now() : Date.now(),
    };

    if (editingId) {
      updateSavedPlace(placeData);
    } else {
      addSavedPlace(placeData);
    }

    resetForm();
    loadPlaces();
  };

  const handleEdit = (place: SavedPlace) => {
    setEditingId(place.id);
    setName(place.name);
    setAddress(place.address);
    setLocation(place.location);
    setCategory(place.category || "");
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const templates = getTripTemplates();
    const usedInTemplates = templates.filter(t => t.startPlaceId === id || t.endPlaceId === id);
    
    if (usedInTemplates.length > 0) {
      if (!confirm(`This place is used in ${usedInTemplates.length} template(s). Delete anyway?`)) {
        return;
      }
    }

    deleteSavedPlace(id);
    loadPlaces();
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setAddress("");
    setLocation(null);
    setCategory("");
  };

  const groupedPlaces = places.reduce((acc, place) => {
    const cat = place.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(place);
    return acc;
  }, {} as Record<string, SavedPlace[]>);

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button
          variant="primary"
          onClick={() => setIsAdding(true)}
          disabled={!isOnline}
        >
          Add Saved Place
        </Button>
      )}

      {!isOnline && !isAdding && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
          <p className="text-sm text-yellow-400">⚠️ Offline - Cannot add new places</p>
        </div>
      )}

      {isAdding && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">
            {editingId ? "Edit Place" : "Add New Place"}
          </h4>
          <div className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home, Office, Client Site A"
              required
            />

            <LocationAutocomplete
              label="Address"
              value={address}
              onChange={setAddress}
              onValidSelection={(loc, addr) => {
                setLocation(loc);
                setAddress(addr);
              }}
              placeholder="Enter address..."
              disabled={!isOnline}
            />

            <Input
              label="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., work, personal, client"
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={resetForm}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                className="flex-1"
                disabled={!location}
              >
                {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {Object.keys(groupedPlaces).length === 0 && !isAdding && (
        <Card>
          <p className="text-slate-400 text-center py-8">
            No saved places yet. Add your frequently visited locations.
          </p>
        </Card>
      )}

      {Object.entries(groupedPlaces).map(([cat, categoryPlaces]) => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-slate-400 mb-2">{cat}</h4>
          <div className="space-y-2">
            {categoryPlaces.map((place) => (
              <Card key={place.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-white">{place.name}</h5>
                    <p className="text-sm text-slate-400 mt-1">{place.address}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {place.location.lat.toFixed(4)}, {place.location.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(place)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDelete(place.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
