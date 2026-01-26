"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { loadGoogleMapsAPI } from "@/lib/googleMaps";
import { GpsPoint } from "@/types";

interface LocationAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidSelection: (location: GpsPoint, address: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({
  label,
  value,
  onChange,
  onValidSelection,
  placeholder = "Enter address...",
  error,
  disabled = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasValidSelection, setHasValidSelection] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      const maps = await loadGoogleMapsAPI();
      if (maps) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const div = document.createElement("div");
        placesService.current = new google.maps.places.PlacesService(div);
      }
    };

    initAutocomplete();
  }, []);

  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setHasValidSelection(false);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (!newValue || newValue.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      debounceTimer.current = setTimeout(() => {
        if (autocompleteService.current) {
          autocompleteService.current.getPlacePredictions(
            { input: newValue },
            (predictions, status) => {
              setIsLoading(false);
              if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setSuggestions(predictions);
                setShowSuggestions(true);
              } else {
                setSuggestions([]);
                setShowSuggestions(false);
              }
            }
          );
        }
      }, 300);
    },
    [onChange]
  );

  const handleSelectSuggestion = useCallback(
    (placeId: string, description: string) => {
      if (!placesService.current) return;

      placesService.current.getDetails(
        { placeId, fields: ["geometry", "formatted_address"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const location: GpsPoint = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              timestamp: Date.now(),
            };
            const address = place.formatted_address || description;
            onChange(address);
            onValidSelection(location, address);
            setHasValidSelection(true);
            setShowSuggestions(false);
            setSuggestions([]);
          }
        }
      );
    },
    [onChange, onValidSelection]
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-200 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-slate-800 border ${
          error ? "border-red-500" : hasValidSelection ? "border-green-500" : "border-slate-700"
        } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {isLoading && (
        <div className="absolute right-3 top-9 text-slate-400 text-sm">
          Searching...
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {!hasValidSelection && value && !isLoading && (
        <p className="mt-1 text-sm text-yellow-500">
          Please select a location from the dropdown
        </p>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
              className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
            >
              <div className="text-sm">{suggestion.structured_formatting.main_text}</div>
              <div className="text-xs text-slate-400">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
      {showSuggestions && suggestions.length === 0 && !isLoading && value.length >= 3 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-3">
          <p className="text-sm text-slate-400">No results found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
