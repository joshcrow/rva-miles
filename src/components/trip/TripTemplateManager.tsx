"use client";

import { useState, useEffect } from "react";
import { TripTemplate, SavedPlace, Vehicle, TripCategory } from "@/types";
import { getTripTemplates, addTripTemplate, updateTripTemplate, deleteTripTemplate, generateId, getSavedPlaces, getVehicles, getTripCategories } from "@/lib/storage";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface TripTemplateManagerProps {
  onUseTemplate?: (template: TripTemplate) => void;
}

export default function TripTemplateManager({ onUseTemplate }: TripTemplateManagerProps) {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<TripCategory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startPlaceId, setStartPlaceId] = useState("");
  const [endPlaceId, setEndPlaceId] = useState("");
  const [category, setCategory] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTemplates(getTripTemplates());
    setPlaces(getSavedPlaces());
    setVehicles(getVehicles());
    setCategories(getTripCategories());
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }

    const templateData: TripTemplate = {
      id: editingId || generateId(),
      name: name.trim(),
      startPlaceId: startPlaceId || undefined,
      endPlaceId: endPlaceId || undefined,
      category: category || undefined,
      vehicleId: vehicleId || undefined,
      createdAt: editingId ? templates.find(t => t.id === editingId)?.createdAt || Date.now() : Date.now(),
    };

    if (editingId) {
      updateTripTemplate(templateData);
    } else {
      addTripTemplate(templateData);
    }

    resetForm();
    loadData();
  };

  const handleEdit = (template: TripTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setStartPlaceId(template.startPlaceId || "");
    setEndPlaceId(template.endPlaceId || "");
    setCategory(template.category || "");
    setVehicleId(template.vehicleId || "");
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this template?")) {
      deleteTripTemplate(id);
      loadData();
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setStartPlaceId("");
    setEndPlaceId("");
    setCategory("");
    setVehicleId("");
  };

  const getPlaceName = (placeId?: string) => {
    if (!placeId) return "Not set";
    const place = places.find(p => p.id === placeId);
    return place ? place.name : "Unknown";
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button
          variant="primary"
          onClick={() => setIsAdding(true)}
        >
          Add Template
        </Button>
      )}

      {isAdding && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">
            {editingId ? "Edit Template" : "Add New Template"}
          </h4>
          <div className="space-y-4">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home to Office"
              required
            />

            <Select
              label="Start Place (optional)"
              value={startPlaceId}
              onChange={(e) => setStartPlaceId(e.target.value)}
              options={[
                { value: "", label: "Select start place..." },
                ...places.map(p => ({ value: p.id, label: p.name }))
              ]}
            />

            <Select
              label="End Place (optional)"
              value={endPlaceId}
              onChange={(e) => setEndPlaceId(e.target.value)}
              options={[
                { value: "", label: "Select end place..." },
                ...places.map(p => ({ value: p.id, label: p.name }))
              ]}
            />

            <Select
              label="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "", label: "None" },
                ...categories.map(c => ({ value: c.name, label: c.name }))
              ]}
            />

            <Select
              label="Vehicle (optional)"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              options={[
                { value: "", label: "Default vehicle" },
                ...vehicles.map(v => ({ value: v.id, label: v.name }))
              ]}
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
              >
                {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {templates.length === 0 && !isAdding && (
        <Card>
          <p className="text-slate-400 text-center py-8">
            No templates yet. Create templates for frequently repeated trips.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-semibold text-white">{template.name}</h5>
                <div className="text-sm text-slate-400 mt-1 space-y-1">
                  <p>Start: {getPlaceName(template.startPlaceId)}</p>
                  <p>End: {getPlaceName(template.endPlaceId)}</p>
                  {template.category && <p>Category: {template.category}</p>}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {onUseTemplate && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onUseTemplate(template)}
                  >
                    Use
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
