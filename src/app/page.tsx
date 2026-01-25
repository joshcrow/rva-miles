"use client";

import { useState, useCallback, useEffect } from "react";
import { Trip } from "@/types";
import PinGate from "@/components/auth/PinGate";
import TripTracker from "@/components/trip/TripTracker";
import TripHistory from "@/components/trip/TripHistory";
import ManualTripForm from "@/components/trip/ManualTripForm";
import VehicleManager from "@/components/vehicle/VehicleManager";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { addTestData, clearAllData, getTestDataSummary } from "@/lib/testData";

type View = "home" | "vehicles" | "export" | "settings";

function AppContent() {
  const [currentView, setCurrentView] = useState<View>("home");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const handleTripComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEditTrip = useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setShowManualForm(true);
  }, []);

  const handleSaveTrip = useCallback(() => {
    setShowManualForm(false);
    setEditingTrip(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowManualForm(false);
    setEditingTrip(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">RVA Miles</h1>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView("home")}
              className={`p-2 rounded-lg transition-colors ${
                currentView === "home"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Home"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>
            <button
              onClick={() => setCurrentView("vehicles")}
              className={`p-2 rounded-lg transition-colors ${
                currentView === "vehicles"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Vehicles"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
            </button>
            <button
              onClick={() => setCurrentView("export")}
              className={`p-2 rounded-lg transition-colors ${
                currentView === "export"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Export"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setCurrentView("settings")}
              className={`p-2 rounded-lg transition-colors ${
                currentView === "settings"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Settings"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {currentView === "home" && (
          <div className="space-y-6">
            <TripTracker onTripComplete={handleTripComplete} />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Trip History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualForm(true)}
              >
                + Add Manual
              </Button>
            </div>

            <TripHistory
              refreshKey={refreshKey}
              onEditTrip={handleEditTrip}
            />
          </div>
        )}

        {currentView === "vehicles" && (
          <VehicleManager onClose={() => setCurrentView("home")} />
        )}

        {currentView === "export" && (
          <ExportView onBack={() => setCurrentView("home")} />
        )}

        {currentView === "settings" && (
          <SettingsView
            onBack={() => setCurrentView("home")}
            onDataChange={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </main>

      {/* Manual Trip Form Modal */}
      {showManualForm && (
        <ManualTripForm
          trip={editingTrip}
          onClose={handleCloseForm}
          onSave={handleSaveTrip}
        />
      )}
    </div>
  );
}

// Main export with PIN gate wrapper
export default function Home() {
  return (
    <PinGate>
      <AppContent />
    </PinGate>
  );
}

// Export View Component
function ExportView({ onBack }: { onBack: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setTrips(JSON.parse(localStorage.getItem("rva-miles-trips") || "[]"));
    setVehicles(JSON.parse(localStorage.getItem("rva-miles-vehicles") || "[]"));
  }, []);

  const handleExport = () => {
    // Filter by date if specified
    let filteredTrips = trips;
    if (startDate) {
      const start = new Date(startDate).getTime();
      filteredTrips = filteredTrips.filter((t) => t.startTime >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      filteredTrips = filteredTrips.filter((t) => t.startTime <= end);
    }

    if (filteredTrips.length === 0) {
      alert("No trips found for the selected date range");
      return;
    }

    // Create CSV content
    const headers = [
      "Date",
      "Start Time",
      "End Time",
      "Vehicle",
      "Distance (miles)",
      "Purpose",
      "Start Lat",
      "Start Lng",
      "End Lat",
      "End Lng",
    ];

    const getVehicleName = (id: string) => {
      const v = vehicles.find((v) => v.id === id);
      return v?.name || "Unknown";
    };

    const rows = filteredTrips.map((trip) => [
      new Date(trip.startTime).toLocaleDateString(),
      new Date(trip.startTime).toLocaleTimeString(),
      trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : "",
      getVehicleName(trip.vehicleId),
      trip.distanceMiles.toFixed(2),
      trip.purpose || "",
      trip.startLocation.lat.toFixed(6),
      trip.startLocation.lng.toFixed(6),
      trip.endLocation?.lat.toFixed(6) || "",
      trip.endLocation?.lng.toFixed(6) || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mileage-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter trips for display
  let filteredTrips = trips;
  if (startDate) {
    const start = new Date(startDate).getTime();
    filteredTrips = filteredTrips.filter((t) => t.startTime >= start);
  }
  if (endDate) {
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    filteredTrips = filteredTrips.filter((t) => t.startTime <= end);
  }

  const totalMiles = filteredTrips.reduce((sum, t) => sum + t.distanceMiles, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Export Trips</h2>
        <button
          onClick={onBack}
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
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Trips in range:</span>
              <span className="text-white font-medium">{filteredTrips.length}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Total miles:</span>
              <span className="text-white font-medium text-xl">
                {totalMiles.toFixed(1)} mi
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleExport}
            disabled={filteredTrips.length === 0}
          >
            Download CSV
          </Button>
        </div>
      </Card>

      <p className="text-sm text-slate-500 text-center">
        CSV files can be opened in Excel, Google Sheets, or any spreadsheet app.
      </p>
    </div>
  );
}

// Settings View Component
function SettingsView({
  onBack,
  onDataChange,
}: {
  onBack: () => void;
  onDataChange: () => void;
}) {
  const [summary, setSummary] = useState({ totalTrips: 0, totalMiles: 0, dateRange: "No trips" });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setSummary(getTestDataSummary());
  }, []);

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      const count = addTestData(4); // 4 weeks of data
      setSummary(getTestDataSummary());
      onDataChange();
      alert(`Generated ${count} test trips!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate test data");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearTrips = () => {
    if (confirm("This will delete all trip data (but keep your PIN and vehicles). Continue?")) {
      clearAllData();
      setSummary(getTestDataSummary());
      onDataChange();
    }
  };

  const handleResetAll = () => {
    if (confirm("This will delete ALL data including your PIN. You will need to set up a new PIN. Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleChangePIN = () => {
    if (confirm("This will log you out and require you to set a new PIN. Continue?")) {
      localStorage.removeItem("rva-miles-pin-hash");
      localStorage.removeItem("rva-miles-pin-verified");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <button
          onClick={onBack}
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
      </div>

      {/* Data Summary */}
      <Card>
        <h3 className="font-medium text-white mb-3">Data Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Total trips:</span>
            <span className="text-white">{summary.totalTrips}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total miles:</span>
            <span className="text-white">{summary.totalMiles} mi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Date range:</span>
            <span className="text-white">{summary.dateRange}</span>
          </div>
        </div>
      </Card>

      {/* Test Data */}
      <Card>
        <h3 className="font-medium text-white mb-3">Test Data</h3>
        <p className="text-slate-400 text-sm mb-4">
          Generate realistic sample trips around Richmond, VA to test export functionality.
        </p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleGenerateTestData}
          isLoading={isGenerating}
        >
          Generate 4 Weeks of Test Data
        </Button>
      </Card>

      {/* Security */}
      <Card>
        <h3 className="font-medium text-white mb-3">Security</h3>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleChangePIN}
        >
          Change PIN
        </Button>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <h3 className="font-medium text-red-400 mb-3">Danger Zone</h3>
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full text-red-400 hover:bg-red-900/20"
            onClick={handleClearTrips}
          >
            Clear All Trips
          </Button>
          <Button
            variant="ghost"
            className="w-full text-red-400 hover:bg-red-900/20"
            onClick={handleResetAll}
          >
            Reset Everything
          </Button>
        </div>
      </Card>

      <p className="text-xs text-slate-500 text-center">
        All data is stored locally on this device only.
      </p>
    </div>
  );
}
