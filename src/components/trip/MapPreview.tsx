"use client";

import { useState } from "react";
import { Trip } from "@/types";
import { getStaticMapUrl } from "@/lib/googleMaps";

interface MapPreviewProps {
  trip: Trip;
  size?: "small" | "medium" | "large";
  showControls?: boolean;
}

export default function MapPreview({
  trip,
  size = "medium",
  showControls = false,
}: MapPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const mapUrl = getStaticMapUrl(trip);

  const sizeClasses = {
    small: "w-full h-32",
    medium: "w-full h-48",
    large: "w-full h-96",
  };

  if (!mapUrl || imageError) {
    return (
      <div className={`${sizeClasses[size]} bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700`}>
        <div className="text-center p-4">
          <p className="text-slate-400 text-sm">Map unavailable</p>
          {trip.startLocation && trip.endLocation && (
            <div className="mt-2 text-xs text-slate-500">
              <p>Start: {trip.startLocation.lat.toFixed(4)}, {trip.startLocation.lng.toFixed(4)}</p>
              <p>End: {trip.endLocation.lat.toFixed(4)}, {trip.endLocation.lng.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`${sizeClasses[size]} bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700`}>
          <p className="text-slate-400 text-sm">Loading map...</p>
        </div>
      )}
      <img
        src={mapUrl}
        alt="Trip route map"
        className={`${sizeClasses[size]} rounded-lg object-cover border border-slate-700 ${isLoading ? 'hidden' : ''}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
      />
      {showControls && !isLoading && !imageError && (
        <div className="mt-2 flex gap-2">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
}
