"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import type { LatLng, Place } from "@/types";
import { autocomplete, type PlaceSuggestion } from "@/lib/geocode";
import { placeLabel } from "./format";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 3;

export interface PlaceFieldProps {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder?: string;
  /** Bias suggestions toward here (usually the trip's origin). */
  nearLat?: number;
  nearLng?: number;
  autoFocus?: boolean;
}

/**
 * Address field with Photon autocomplete. Text the user typed but never
 * matched to a suggestion is still accepted as a name-only Place — offline or
 * an unreachable geocoder must never block logging a trip.
 */
export function PlaceField({
  label,
  value,
  onChange,
  placeholder,
  nearLat,
  nearLng,
  autoFocus,
}: PlaceFieldProps) {
  const [query, setQuery] = useState(() => (value ? placeLabel(value) : ""));
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  // Mirrors the last value this field itself produced, so a value changed from
  // outside (origin chip, current location) re-seeds the text but the parent
  // echoing back our own change does not wipe what's being typed.
  const [ownValue, setOwnValue] = useState(value);
  const seq = useRef(0);
  const timer = useRef<number | null>(null);

  if (value !== ownValue) {
    setOwnValue(value);
    setQuery(value ? placeLabel(value) : "");
    setSuggestions([]);
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const search = useCallback(
    (raw: string) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      const q = raw.trim();
      if (q.length < MIN_QUERY) {
        seq.current += 1;
        setSuggestions([]);
        setBusy(false);
        return;
      }
      const id = ++seq.current;
      setBusy(true);
      const near: LatLng | undefined =
        nearLat != null && nearLng != null ? { lat: nearLat, lng: nearLng } : undefined;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void autocomplete(q, near).then((found) => {
          if (id !== seq.current) return;
          setSuggestions(found);
          setBusy(false);
        });
      }, DEBOUNCE_MS);
    },
    [nearLat, nearLng],
  );

  const select = useCallback(
    (s: PlaceSuggestion) => {
      const place: Place = { name: s.name, address: s.address || undefined, latLng: s.latLng };
      seq.current += 1;
      setOwnValue(place);
      setQuery(s.name);
      setSuggestions([]);
      setBusy(false);
      setFocused(false);
      onChange(place);
    },
    [onChange],
  );

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    seq.current += 1;
    setOwnValue(null);
    setQuery("");
    setSuggestions([]);
    setBusy(false);
    onChange(null);
  }, [onChange]);

  const commitFreeText = useCallback(() => {
    const text = query.trim();
    if (!text) {
      if (value) clear();
      return;
    }
    if (value && placeLabel(value) === text) return;
    const place: Place = { name: text };
    setOwnValue(place);
    onChange(place);
  }, [clear, onChange, query, value]);

  const showList = focused && (busy || suggestions.length > 0);

  return (
    <Box>
      <TextField
        label={label}
        placeholder={placeholder}
        value={query}
        autoFocus={autoFocus}
        fullWidth
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commitFreeText();
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (value) {
            setOwnValue(null);
            onChange(null);
          }
          search(next);
        }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                {busy ? (
                  <CircularProgress size={16} />
                ) : query ? (
                  <IconButton size="small" aria-label={`Clear ${label}`} onClick={clear}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </InputAdornment>
            ),
          },
        }}
      />

      {/* The dropdown's radius comes from MuiPaper.rounded (the card token). */}
      {showList ? (
        <Paper
          variant="outlined"
          sx={{ mt: 0.75, overflow: "hidden", maxHeight: 264, overflowY: "auto" }}
        >
          {busy && suggestions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
              Searching…
            </Typography>
          ) : (
            <List disablePadding>
              {suggestions.map((s, i) => (
                <ListItemButton
                  key={`${s.latLng.lat},${s.latLng.lng},${i}`}
                  // Keep the field from blurring (and committing free text)
                  // before this tap is handled.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(s)}
                  // Deliberately square: a full-bleed row inside a clipped
                  // Paper — its own corners would double against the card's.
                  sx={{ borderRadius: 0, alignItems: "flex-start", py: 1.25 }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, width: "100%" }}>
                    <PlaceRoundedIcon sx={{ fontSize: 18, mt: 0.25, color: "text.disabled" }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {s.name}
                      </Typography>
                      {s.address ? (
                        <Typography variant="caption" color="text.secondary" noWrap component="p">
                          {s.address}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      ) : null}
    </Box>
  );
}

export default PlaceField;
