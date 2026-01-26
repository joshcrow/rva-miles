"use client";

import { useState, useEffect } from "react";
import { Trip, TripCategory } from "@/types";
import { getTrips, getTripCategories, getSettings } from "@/lib/storage";
import { formatDistance, formatDollarAmount } from "@/lib/geo";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ReportsViewProps {
  onBack: () => void;
}

export default function ReportsView({ onBack }: ReportsViewProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<TripCategory[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const settings = getSettings();

  useEffect(() => {
    setTrips(getTrips());
    setCategories(getTripCategories());
    
    // Default to current month
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  const getMonthlyTrips = () => {
    if (!selectedMonth) return [];
    
    const [year, month] = selectedMonth.split("-").map(Number);
    return trips.filter((trip) => {
      const tripDate = new Date(trip.startTime);
      return (
        tripDate.getFullYear() === year && tripDate.getMonth() === month - 1
      );
    });
  };

  const monthlyTrips = getMonthlyTrips();
  const totalMiles = monthlyTrips.reduce((sum, t) => sum + t.distanceMiles, 0);
  const totalReimbursement = totalMiles * settings.irsRate;

  // Group by category
  const categoryBreakdown = monthlyTrips.reduce((acc, trip) => {
    const cat = trip.category || "Uncategorized";
    if (!acc[cat]) {
      acc[cat] = { trips: 0, miles: 0 };
    }
    acc[cat].trips++;
    acc[cat].miles += trip.distanceMiles;
    return acc;
  }, {} as Record<string, { trips: number; miles: number }>);

  // Group by week
  const weeklyBreakdown = monthlyTrips.reduce((acc, trip) => {
    const date = new Date(trip.startTime);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = { trips: 0, miles: 0 };
    }
    acc[weekKey].trips++;
    acc[weekKey].miles += trip.distanceMiles;
    return acc;
  }, {} as Record<string, { trips: number; miles: number }>);

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find((c) => c.name === categoryName);
    return category?.color || "#6b7280";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Reports</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Month Selector */}
      <Card>
        <label className="block text-sm text-slate-400 mb-2">Select Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white"
        />
      </Card>

      {/* Summary */}
      <Card>
        <h3 className="font-medium text-white mb-4">Monthly Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total Trips:</span>
            <span className="text-white font-medium text-xl">{monthlyTrips.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total Miles:</span>
            <span className="text-white font-medium text-xl">{formatDistance(totalMiles)}</span>
          </div>
          {settings.showDollarAmounts && (
            <div className="flex justify-between items-center pt-3 border-t border-slate-700">
              <span className="text-slate-400">Total Reimbursement:</span>
              <span className="text-green-400 font-semibold text-2xl">
                {formatDollarAmount(totalMiles, settings.irsRate)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <h3 className="font-medium text-white mb-4">By Category</h3>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown)
              .sort((a, b) => b[1].miles - a[1].miles)
              .map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getCategoryColor(cat) }}
                    />
                    <span className="text-slate-300">{cat}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatDistance(data.miles)}
                    </div>
                    <div className="text-xs text-slate-500">{data.trips} trips</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Weekly Breakdown */}
      {Object.keys(weeklyBreakdown).length > 0 && (
        <Card>
          <h3 className="font-medium text-white mb-4">By Week</h3>
          <div className="space-y-3">
            {Object.entries(weeklyBreakdown)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([week, data]) => (
                <div key={week} className="flex items-center justify-between">
                  <span className="text-slate-300">
                    Week of {new Date(week).toLocaleDateString()}
                  </span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatDistance(data.miles)}
                    </div>
                    <div className="text-xs text-slate-500">{data.trips} trips</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {monthlyTrips.length === 0 && (
        <Card>
          <p className="text-slate-400 text-center py-8">
            No trips found for selected month.
          </p>
        </Card>
      )}
    </div>
  );
}
