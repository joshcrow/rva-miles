import { create } from 'zustand';
import { Trip, GpsPoint } from '@/types';

interface TrackingState {
  isTracking: boolean;
  activeTrip: Trip | null;
  gpsPoints: GpsPoint[];
  setTracking: (value: boolean) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setGpsPoints: (points: GpsPoint[]) => void;
  addGpsPoint: (point: GpsPoint) => void;
  clearTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  isTracking: false,
  activeTrip: null,
  gpsPoints: [],
  setTracking: (value) => set({ isTracking: value }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  setGpsPoints: (points) => set({ gpsPoints: points }),
  addGpsPoint: (point) => set((state) => ({ gpsPoints: [...state.gpsPoints, point] })),
  clearTracking: () => set({ isTracking: false, activeTrip: null, gpsPoints: [] }),
}));
