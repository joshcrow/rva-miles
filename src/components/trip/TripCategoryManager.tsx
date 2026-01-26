"use client";

import { useState, useEffect } from "react";
import { TripCategory } from "@/types";
import { getTripCategories, addTripCategory, updateTripCategory, deleteTripCategory, generateId } from "@/lib/storage";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // yellow
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export default function TripCategoryManager() {
  const [categories, setCategories] = useState<TripCategory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    setCategories(getTripCategories());
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a category name");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      alert("Invalid color format");
      return;
    }

    const categoryData: TripCategory = {
      id: editingId || generateId(),
      name: name.trim(),
      color,
      createdAt: editingId ? categories.find(c => c.id === editingId)?.createdAt || Date.now() : Date.now(),
    };

    if (editingId) {
      updateTripCategory(categoryData);
    } else {
      addTripCategory(categoryData);
    }

    resetForm();
    loadCategories();
  };

  const handleEdit = (category: TripCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color || DEFAULT_COLORS[0]);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this category?")) {
      deleteTripCategory(id);
      loadCategories();
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setColor(DEFAULT_COLORS[0]);
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button
          variant="primary"
          onClick={() => setIsAdding(true)}
        >
          Add Category
        </Button>
      )}

      {isAdding && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">
            {editingId ? "Edit Category" : "Add New Category"}
          </h4>
          <div className="space-y-4">
            <Input
              label="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Client Visits"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <div className="flex gap-2">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded border-2 border-slate-700 hover:border-slate-500"
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div
                className="mt-2 px-3 py-2 rounded-lg inline-block text-white text-sm font-medium"
                style={{ backgroundColor: color }}
              >
                {name || "Preview"}
              </div>
            </div>

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

      {categories.length === 0 && !isAdding && (
        <Card>
          <p className="text-slate-400 text-center py-8">
            No categories yet. Add categories to organize your trips.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <Card key={category.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-semibold text-white">{category.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
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
