"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import type { Route } from "@/types";
import { formatKey } from "@/lib/dates";
import Sheet from "./Sheet";
import { fmtMiles, placeLabel } from "./format";

export interface CatchUpSuggestion {
  dateKey: string;
  route: Route;
}

export interface CatchUpSheetProps {
  open: boolean;
  onClose: () => void;
  suggestions: CatchUpSuggestion[];
  /** Resolves true when the trip was persisted. */
  onLog: (route: Route, dateKey: string) => Promise<boolean>;
  onAddOther: (dateKey: string) => void;
}

interface DayGroup {
  dateKey: string;
  routes: Route[];
}

function groupByDay(suggestions: CatchUpSuggestion[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const s of suggestions) {
    const last = groups[groups.length - 1];
    if (last && last.dateKey === s.dateKey) last.routes.push(s.route);
    else groups.push({ dateKey: s.dateKey, routes: [s.route] });
  }
  return groups;
}

export function CatchUpSheet({ open, onClose, suggestions, onLog, onAddOther }: CatchUpSheetProps) {
  // The live suggestion list shrinks the moment a day gets its first trip, so
  // the sheet works from a snapshot taken when it opened — rows tick over to
  // "logged" in place instead of vanishing under the user's finger.
  const [frozen, setFrozen] = useState<CatchUpSuggestion[]>(suggestions);
  const [done, setDone] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrozen(suggestions);
    setDone({});
    setBusy(null);
    // Snapshot intentionally taken only at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => groupByDay(frozen), [frozen]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Missing anything?"
      subtitle="Your usual trips for days with nothing logged"
    >
      <Stack spacing={2.5} sx={{ pb: 1 }}>
        {groups.map((group) => (
          <Box key={group.dateKey}>
            <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 0.75 }}>
              {`${formatKey(group.dateKey, "weekday")} · ${formatKey(group.dateKey, "short")}`}
            </Typography>

            <Stack spacing={1}>
              {group.routes.map((route) => {
                const rowKey = `${group.dateKey}|${route.id}`;
                const logged = done[rowKey] === true;
                const miles = route.defaultRoundTrip ? route.distanceMiles * 2 : route.distanceMiles;

                return (
                  <ButtonBase
                    key={rowKey}
                    disabled={logged || busy !== null}
                    onClick={async () => {
                      setBusy(rowKey);
                      const ok = await onLog(route, group.dateKey);
                      setBusy(null);
                      if (ok) setDone((d) => ({ ...d, [rowKey]: true }));
                    }}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 3,
                      px: 1.75,
                      py: 1.5,
                      minHeight: 60,
                      border: "1px solid",
                      borderColor: logged ? "success.main" : "divider",
                      bgcolor: logged ? "transparent" : "background.paper",
                      opacity: logged ? 0.75 : 1,
                      transition: "transform 140ms ease",
                      "&:active": { transform: "scale(0.985)" },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%" }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" component="span" sx={{ display: "block" }} noWrap>
                          {placeLabel(route.to)}
                        </Typography>
                        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minWidth: 0 }}>
                          <ArrowRightAltRoundedIcon
                            sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }}
                          />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {placeLabel(route.from)}
                          </Typography>
                        </Stack>
                      </Box>

                      {busy === rowKey ? (
                        <CircularProgress size={18} />
                      ) : logged ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                          <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "success.main" }} />
                          <Typography
                            variant="caption"
                            component="span"
                            sx={{ color: "success.main", fontWeight: 700 }}
                          >
                            Logged
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.4} alignItems="baseline" sx={{ flexShrink: 0 }}>
                          <Typography
                            component="span"
                            className="tnum"
                            sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}
                          >
                            {fmtMiles(miles)}
                          </Typography>
                          <Typography variant="caption" component="span" color="text.secondary">
                            mi
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </ButtonBase>
                );
              })}

              <ButtonBase
                onClick={() => onAddOther(group.dateKey)}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderRadius: 3,
                  px: 1.75,
                  py: 1.25,
                  minHeight: 48,
                  color: "primary.main",
                  border: "1px dashed",
                  borderColor: "rgba(124,58,237,0.35)",
                  "&:active": { bgcolor: "action.selected" },
                }}
              >
                <AddRoundedIcon sx={{ fontSize: 18, mr: 0.75 }} />
                <Typography variant="subtitle2" component="span" sx={{ color: "primary.main" }}>
                  Something else
                </Typography>
              </ButtonBase>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Sheet>
  );
}

export default CatchUpSheet;
