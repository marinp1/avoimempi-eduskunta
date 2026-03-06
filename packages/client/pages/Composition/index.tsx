import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  InputAdornment,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { ItemTraceIcon } from "#client/components/ItemTraceIcon";
import {
  type HallituskausiPeriod,
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { commonStyles, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { RepresentativeDetails } from "./Details";

type MemberWithExtras = DatabaseQueries.GetParliamentComposition & {
  party_name?: string;
  is_in_government?: number;
};

// ─── Timeline selector ────────────────────────────────────────────────────────

const TimelineSelector: React.FC<{
  hallituskaudet: HallituskausiPeriod[];
  selectedHallituskausi: HallituskausiPeriod | null;
  date: string;
  todayIso: string;
  onDateChange: (date: string) => void;
}> = ({
  hallituskaudet,
  selectedHallituskausi,
  date,
  todayIso,
  onDateChange,
}) => {
  const tc = useThemedColors();

  const rangeStart =
    selectedHallituskausi?.startDate ??
    hallituskaudet.reduce(
      (min, p) => (p.startDate < min ? p.startDate : min),
      hallituskaudet[0]?.startDate ?? "2000-01-01",
    );
  const rangeEnd = selectedHallituskausi?.endDate ?? todayIso;

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const span = endMs - startMs;

  if (span <= 0 || hallituskaudet.length === 0) return null;

  const toMs = (d: string) => new Date(d).getTime();
  const toDate = (ms: number) => new Date(ms).toISOString().split("T")[0];
  const toPct = (d: string) =>
    Math.max(0, Math.min(100, ((toMs(d) - startMs) / span) * 100));

  const visible = hallituskaudet
    .filter(
      (p) => p.startDate <= rangeEnd && (p.endDate ?? todayIso) >= rangeStart,
    )
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  const startYear = new Date(rangeStart).getFullYear();
  const endYear = new Date(rangeEnd).getFullYear();
  const yearSpan = endYear - startYear;
  const yearStep = yearSpan <= 5 ? 1 : yearSpan <= 10 ? 2 : 4;
  const yearTicks: number[] = [];
  for (let y = startYear + 1; y <= endYear; y++) {
    if ((y - startYear) % yearStep === 0) {
      const pct = toPct(`${y}-01-01`);
      if (pct > 2 && pct < 98) yearTicks.push(y);
    }
  }

  const currentMs = Math.max(startMs, Math.min(endMs, toMs(date)));

  const formatLabel = (ms: number) => {
    const [yr, mo, dy] = toDate(ms).split("-");
    return `${parseInt(dy)}.${parseInt(mo)}.${yr}`;
  };

  // Build flex segments: periods interleaved with gap-fillers so the
  // layout is driven by actual durations — no floating-point overlap possible.
  // Overlapping source data is surfaced as a distinct amber "overlap" segment.
  type Seg =
    | { kind: "period"; p: HallituskausiPeriod; duration: number; idx: number }
    | { kind: "gap"; duration: number }
    | {
        kind: "overlap";
        duration: number;
        prev: HallituskausiPeriod;
        curr: HallituskausiPeriod;
      };

  const segments: Seg[] = [];
  let cursor = startMs;
  for (let i = 0; i < visible.length; i++) {
    const p = visible[i];
    const pStart = Math.max(toMs(p.startDate), startMs);
    const pEnd = Math.min(toMs(p.endDate ?? todayIso), endMs);
    if (pStart < cursor) {
      // Overlap: previous period extended into this one's range.
      // Ignore overlaps of ≤ 2 days — same-day or off-by-one boundaries in source data.
      const MS_PER_DAY = 86_400_000;
      const overlapDuration = cursor - pStart;
      const prevPeriod = visible[i - 1];
      if (overlapDuration > 2 * MS_PER_DAY && prevPeriod) {
        segments.push({
          kind: "overlap",
          duration: overlapDuration,
          prev: prevPeriod,
          curr: p,
        });
      }
      // This period's visible slice starts where the previous left off
      if (pEnd > cursor) {
        segments.push({ kind: "period", p, duration: pEnd - cursor, idx: i });
        cursor = pEnd;
      }
    } else {
      if (pStart > cursor) {
        segments.push({ kind: "gap", duration: pStart - cursor });
      }
      if (pEnd > pStart) {
        segments.push({ kind: "period", p, duration: pEnd - pStart, idx: i });
        cursor = pEnd;
      }
    }
  }
  if (cursor < endMs) {
    segments.push({ kind: "gap", duration: endMs - cursor });
  }

  return (
    <Box sx={{ mb: spacing.md }}>
      {/* Period blocks — flex layout driven by duration, no gaps/overlaps */}
      <Box
        sx={{
          display: "flex",
          height: 28,
          borderRadius: 0.5,
          overflow: "hidden",
          border: `1px solid ${tc.dataBorder}`,
        }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === "gap") {
            return (
              <Box
                key={`gap-${i}`}
                sx={{ flexGrow: seg.duration, flexBasis: 0, flexShrink: 1 }}
              />
            );
          }
          if (seg.kind === "overlap") {
            const { prev, curr } = seg;
            const tooltipText = [
              "⚠ Päällekkäinen jakso (data-ongelma)",
              prev.label,
              curr.label,
            ].join("\n");
            return (
              <Tooltip
                key={`overlap-${i}`}
                title={
                  <span style={{ whiteSpace: "pre-line" }}>{tooltipText}</span>
                }
                placement="top"
                arrow
              >
                <Box
                  sx={{
                    flexGrow: seg.duration,
                    flexBasis: 0,
                    flexShrink: 1,
                    bgcolor: `${tc.warning}30`,
                    borderLeft: `1px solid ${tc.warning}70`,
                    borderRight: `1px solid ${tc.warning}70`,
                    cursor: "help",
                  }}
                />
              </Tooltip>
            );
          }
          const { p, duration, idx } = seg;
          const isSelected = selectedHallituskausi?.id === p.id;
          const nextIsPeriod = segments[i + 1]?.kind === "period";
          return (
            <Box
              key={p.id}
              title={p.label}
              onClick={() =>
                onDateChange(
                  p.startDate > rangeStart ? p.startDate : rangeStart,
                )
              }
              sx={{
                flexGrow: duration,
                flexBasis: 0,
                flexShrink: 1,
                position: "relative",
                bgcolor: isSelected
                  ? `${tc.primary}18`
                  : idx % 2 === 0
                    ? `${tc.primary}08`
                    : `${tc.primary}03`,
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                px: 0.75,
                cursor: "pointer",
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: `${tc.primary}14` },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? tc.primary : tc.textTertiary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {p.name}
              </Typography>
              {nextIsPeriod && (
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "15%",
                    bottom: "15%",
                    width: "1px",
                    bgcolor: tc.dataBorder,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Slider */}
      <Box sx={{ px: 0.75 }}>
        <Slider
          value={currentMs}
          min={startMs}
          max={endMs}
          step={86_400_000}
          onChange={(_, v) => onDateChange(toDate(v as number))}
          valueLabelDisplay="auto"
          valueLabelFormat={formatLabel}
          sx={{
            py: "6px !important",
            color: tc.primary,
            "& .MuiSlider-thumb": {
              width: 14,
              height: 14,
              "&:hover, &.Mui-focusVisible": {
                boxShadow: `0 0 0 6px ${tc.primary}1A`,
              },
            },
            "& .MuiSlider-rail": {
              bgcolor: tc.dataBorder,
              opacity: 1,
              height: 4,
            },
            "& .MuiSlider-track": {
              height: 4,
              bgcolor: `${tc.primary}40`,
              border: "none",
            },
            "& .MuiSlider-valueLabel": {
              fontSize: "0.7rem",
              py: 0.25,
              px: 0.75,
              bgcolor: tc.primary,
            },
          }}
        />
      </Box>

      {/* Year labels */}
      <Box sx={{ position: "relative", height: 14 }}>
        {yearTicks.map((year) => {
          const pct = toPct(`${year}-01-01`);
          return (
            <Typography
              key={year}
              sx={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                fontSize: "0.6rem",
                color: tc.textTertiary,
                userSelect: "none",
                lineHeight: 1,
                top: 0,
              }}
            >
              {year}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export default () => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const { hallituskaudet, selectedHallituskausi, setSelectedHallituskausiId } =
    useHallituskausi();

  // Initialize from URL
  const getInitialDate = (): string => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return new Date().toISOString().split("T")[0];
  };

  const getInitialPersonId = (): number | null => {
    const params = new URLSearchParams(window.location.search);
    const personIdParam = params.get("person");
    return personIdParam ? parseInt(personIdParam, 10) : null;
  };

  const [members, setMembers] = useState<MemberWithExtras[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);

  // New state for dialog
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<DatabaseQueries.GetParliamentComposition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [govFilter, setGovFilter] = useState<
    "all" | "government" | "opposition"
  >("all");
  const [nameSearch, setNameSearch] = useState<string>("");

  // Time domain helpers
  const todayIso = new Date().toISOString().split("T")[0];
  const isToday = date === todayIso;
  const showTimeStrip = !isToday || selectedHallituskausi !== null;

  const formatFinnishDate = (isoDate: string): string => {
    const [year, month, day] = isoDate.split("-");
    return `${parseInt(day, 10)}.${parseInt(month, 10)}.${year}`;
  };

  // Compute statistics
  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const inGovernment = members.filter((m) => m.is_in_government === 1).length;
    const inOpposition = totalMembers - inGovernment;

    // Group by party
    const partyGroups = members.reduce(
      (acc, m) => {
        const party = m.party_name || "Ei tiedossa";
        if (!acc[party]) {
          acc[party] = { total: 0, inGovernment: 0 };
        }
        acc[party].total++;
        if (m.is_in_government === 1) {
          acc[party].inGovernment++;
        }
        return acc;
      },
      {} as Record<string, { total: number; inGovernment: number }>,
    );

    // Sort parties by size
    const sortedParties = Object.entries(partyGroups).sort(
      ([, a], [, b]) => b.total - a.total,
    );

    return {
      totalMembers,
      inGovernment,
      inOpposition,
      partyGroups: sortedParties,
    };
  }, [members]);

  // Fetch members when date changes
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/composition/${date}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DatabaseQueries.GetParliamentComposition[] =
          await res.json();
        setMembers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load members.");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [date]);

  // Open dialog for person in URL on initial load
  useEffect(() => {
    const personId = getInitialPersonId();
    if (personId && members.length > 0) {
      const member = members.find((m) => m.person_id === personId);
      if (member) {
        setSelectedRepresentative(member);
        setDialogOpen(true);
      }
    }
  }, [members, getInitialPersonId]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const newDate = getInitialDate();
      const personId = getInitialPersonId();

      setDate(newDate);

      if (personId && members.length > 0) {
        const member = members.find((m) => m.person_id === personId);
        if (member) {
          setSelectedRepresentative(member);
          setDialogOpen(true);
        }
      } else {
        setDialogOpen(false);
        setSelectedRepresentative(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [members, getInitialDate, getInitialPersonId]);

  // Update URL function
  const updateURL = (newDate?: string, personId?: number | null) => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (newDate !== undefined) {
      params.set("date", newDate);
    }

    if (personId !== undefined) {
      if (personId === null) {
        params.delete("person");
      } else {
        params.set("person", personId.toString());
      }
    }

    window.history.pushState({}, "", url.toString());
  };

  const handleResetToPresent = () => {
    setDate(todayIso);
    updateURL(todayIso);
    setSelectedHallituskausiId("");
  };

  const handleDateChange = (newDate: string) => {
    if (
      selectedHallituskausi &&
      !isDateWithinHallituskausi(newDate, selectedHallituskausi)
    ) {
      const clamped =
        newDate < selectedHallituskausi.startDate
          ? selectedHallituskausi.startDate
          : selectedHallituskausi.endDate || newDate;
      setDate(clamped);
      updateURL(clamped);
      return;
    }
    setDate(newDate);
    updateURL(newDate);
  };

  useEffect(() => {
    if (!selectedHallituskausi) return;
    if (isDateWithinHallituskausi(date, selectedHallituskausi)) return;
    const fallback =
      date < selectedHallituskausi.startDate
        ? selectedHallituskausi.startDate
        : selectedHallituskausi.endDate || selectedHallituskausi.startDate;
    setDate(fallback);
    updateURL(fallback);
  }, [date, selectedHallituskausi]);

  const handleRowClick = (member: DatabaseQueries.GetParliamentComposition) => {
    setSelectedRepresentative(member);
    setDialogOpen(true);
    updateURL(undefined, member.person_id);
  };

  const handleActivateOnKeyDown = (
    event: React.KeyboardEvent,
    onActivate: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRepresentative(null);
    updateURL(undefined, null);
  };

  // Get unique parties for filter
  const uniqueParties = React.useMemo(() => {
    const parties = new Set(members.map((m) => m.party_name).filter(Boolean));
    return Array.from(parties).sort() as string[];
  }, [members]);

  // Filtered members
  const filteredMembers = React.useMemo(() => {
    let result = members;
    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      result = result.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q),
      );
    }
    if (partyFilter) {
      result = result.filter((m) => m.party_name === partyFilter);
    }
    if (govFilter === "government") {
      result = result.filter((m) => m.is_in_government === 1);
    } else if (govFilter === "opposition") {
      result = result.filter((m) => m.is_in_government !== 1);
    }
    return result;
  }, [members, nameSearch, partyFilter, govFilter]);

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: spacing.md }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: themedColors.textPrimary, mb: 0.5 }}
        >
          {t("title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("subtitle")}
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder={t("searchPlaceholder")}
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: 18, color: themedColors.textTertiary }}
                  />
                </InputAdornment>
              ),
              endAdornment: nameSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setNameSearch("")}
                    edge="end"
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
          sx={{ width: { xs: "100%", sm: 320 } }}
        />
      </Box>

      {/* Timeline date selector */}
      <TimelineSelector
        hallituskaudet={hallituskaudet}
        selectedHallituskausi={selectedHallituskausi}
        date={date}
        todayIso={todayIso}
        onDateChange={handleDateChange}
      />

      {/* Filter chips + count */}
      {!loading && !error && members.length > 0 && (
        <Box
          sx={{
            mb: spacing.md,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
          }}
        >
          {(["all", "government", "opposition"] as const).map((g) => (
            <Chip
              key={g}
              label={
                g === "all"
                  ? t("details.filters.all")
                  : g === "government"
                    ? t("details.filters.government")
                    : t("details.filters.opposition")
              }
              size="small"
              onClick={() => setGovFilter(g)}
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                height: 32,
                bgcolor:
                  govFilter === g
                    ? themedColors.primary
                    : themedColors.backgroundPaper,
                color: govFilter === g ? "white" : themedColors.textSecondary,
                border: `1px solid ${govFilter === g ? themedColors.primary : themedColors.dataBorder}`,
                "&:hover": {
                  bgcolor:
                    govFilter === g
                      ? themedColors.primary
                      : `${themedColors.primary}10`,
                },
              }}
            />
          ))}
          <Box
            sx={{
              width: 1,
              height: 24,
              borderLeft: `1px solid ${themedColors.dataBorder}`,
              mx: 0.5,
            }}
          />
          {partyFilter && (
            <Chip
              label={`${partyFilter} ✕`}
              size="small"
              onClick={() => setPartyFilter(null)}
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                height: 32,
                bgcolor: themedColors.primary,
                color: "white",
                "&:hover": { bgcolor: themedColors.primary },
              }}
            />
          )}
          {!partyFilter &&
            uniqueParties.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                onClick={() => setPartyFilter(p)}
                sx={{
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  height: 28,
                  bgcolor: themedColors.backgroundPaper,
                  color: themedColors.textSecondary,
                  border: `1px solid ${themedColors.dataBorder}`,
                  "&:hover": { bgcolor: `${themedColors.primary}10` },
                }}
              />
            ))}
          <Typography
            variant="caption"
            sx={{ color: themedColors.textTertiary, ml: "auto" }}
          >
            {filteredMembers.length} / {members.length} edustajaa
          </Typography>
        </Box>
      )}

      {/* Time context strip — shown when viewing a non-today date or when a period filter is active */}
      {showTimeStrip && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            px: 1.5,
            py: 0.875,
            mb: spacing.md,
            borderRadius: 1,
            bgcolor: `${themedColors.warning}08`,
            borderTop: `1px solid ${themedColors.warning}28`,
            borderRight: `1px solid ${themedColors.warning}28`,
            borderBottom: `1px solid ${themedColors.warning}28`,
            borderLeft: `3px solid ${themedColors.warning}80`,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary, flexGrow: 1 }}
          >
            {selectedHallituskausi ? (
              <>
                <Box
                  component="span"
                  sx={{ fontWeight: 600, color: themedColors.textPrimary }}
                >
                  {selectedHallituskausi.label}
                </Box>
                {!isToday && (
                  <>
                    {" · "}
                    {formatFinnishDate(date)}
                  </>
                )}
              </>
            ) : (
              <>
                <Box
                  component="span"
                  sx={{ fontWeight: 600, color: themedColors.textPrimary }}
                >
                  {t("historicalView")}
                </Box>
                {" · "}
                {formatFinnishDate(date)}
              </>
            )}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleResetToPresent}
            sx={{
              textTransform: "none",
              fontSize: "0.75rem",
              py: 0.25,
              px: 1.25,
              flexShrink: 0,
              borderColor: `${themedColors.warning}60`,
              color: themedColors.warning,
              "&:hover": {
                borderColor: themedColors.warning,
                bgcolor: `${themedColors.warning}10`,
              },
            }}
          >
            {t("returnToPresent")}
          </Button>
        </Box>
      )}

      {/* Stats summary strip */}
      {!loading && !error && stats.totalMembers > 0 && (
        <Box
          sx={{
            mb: spacing.md,
            display: "flex",
            gap: 0.5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 700, color: themedColors.textPrimary }}
            >
              {stats.totalMembers}
            </Box>{" "}
            edustajaa
          </Typography>
          <Box
            component="span"
            sx={{ color: themedColors.dataBorder, mx: 0.75 }}
          >
            ·
          </Box>
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 600, color: themedColors.success }}
            >
              {stats.inGovernment}
            </Box>{" "}
            hallituksessa
          </Typography>
          <Box
            component="span"
            sx={{ color: themedColors.dataBorder, mx: 0.75 }}
          >
            ·
          </Box>
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 600, color: themedColors.warning }}
            >
              {stats.inOpposition}
            </Box>{" "}
            oppositiossa
          </Typography>
        </Box>
      )}

      {/* Loading / Error states */}
      {loading && (
        <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
          <CircularProgress sx={{ color: themedColors.primary }} />
        </Box>
      )}
      {!loading && error && (
        <Alert
          severity="error"
          role="status"
          aria-live="polite"
          sx={{ py: spacing.sm, textAlign: "center", mb: spacing.lg }}
        >
          {error}
        </Alert>
      )}

      {/* Mobile Card List */}
      {!loading && !error && (
        <Fade in timeout={700}>
          <Box>
            {filteredMembers.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  mb: spacing.lg,
                  px: 3,
                  py: 4,
                  borderRadius: 1,
                  border: `1px solid ${themedColors.dataBorder}`,
                  background: themedColors.backgroundPaper,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: themedColors.textPrimary, fontWeight: 600 }}
                >
                  {t("noResults")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary, mt: 0.5 }}
                >
                  {t("noResultsHint")}
                </Typography>
                {(partyFilter || govFilter !== "all") && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 2, textTransform: "none" }}
                    onClick={() => {
                      setPartyFilter(null);
                      setGovFilter("all");
                    }}
                  >
                    {t("resetFilters")}
                  </Button>
                )}
              </Paper>
            ) : (
              <>
                <Box sx={{ display: { xs: "block", lg: "none" } }}>
                  {filteredMembers.map((m) => (
                    <Card
                      key={m.person_id}
                      className="trace-hover-parent"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(m)}
                      onKeyDown={(event) =>
                        handleActivateOnKeyDown(event, () => handleRowClick(m))
                      }
                      sx={{
                        mb: 1.5,
                        cursor: "pointer",
                        border: `1px solid ${themedColors.dataBorder}`,
                        transition: "all 0.2s ease-in-out",
                        "&:focus-visible": {
                          outline: `2px solid ${themedColors.primary}`,
                          outlineOffset: 1,
                        },
                        "&:active": {
                          transform: "scale(0.99)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 600,
                                color: themedColors.textPrimary,
                              }}
                            >
                              {m.first_name} {m.last_name}
                            </Typography>
                            <ItemTraceIcon
                              table="MemberOfParliament"
                              pkName="personId"
                              pkValue={String(m.person_id)}
                              label={`${m.first_name} ${m.last_name}`}
                            />
                          </Box>
                          {m.is_in_government === 1 && (
                            <CheckCircleIcon
                              sx={{
                                color: themedColors.success,
                                fontSize: 20,
                                ml: 1,
                                flexShrink: 0,
                              }}
                              titleAccess="Hallituksessa"
                            />
                          )}
                        </Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {m.party_name && (
                            <Chip
                              label={m.party_name}
                              size="small"
                              sx={{
                                background: themedColors.primary,
                                color: "white",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: 26,
                              }}
                            />
                          )}
                          {m.profession && (
                            <Chip
                              label={m.profession}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: "0.75rem",
                                height: 26,
                              }}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>

                {/* Desktop Table */}
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 1,
                    background: themedColors.backgroundPaper,
                    border: `1px solid ${themedColors.dataBorder}`,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
                    mb: spacing.lg,
                    overflow: "hidden",
                    display: { xs: "none", lg: "block" },
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background: themedColors.primaryGradient,
                        }}
                      >
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.name")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.party")}
                        </TableCell>
                        <TableCell
                          sx={{ ...commonStyles.tableHeader }}
                          align="center"
                        >
                          {t("table.government")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.gender")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.birthDate")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.birthPlace")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("table.occupation")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMembers.map((m, index) => (
                        <TableRow
                          key={m.person_id}
                          className="trace-hover-parent"
                          hover
                          tabIndex={0}
                          onClick={() => handleRowClick(m)}
                          onKeyDown={(event) =>
                            handleActivateOnKeyDown(event, () =>
                              handleRowClick(m),
                            )
                          }
                          sx={{
                            ...commonStyles.tableRow,
                            borderBottom: `1px solid ${themedColors.dataBorder}`,
                            "&:hover": {
                              background: `${themedColors.primary}08`,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            },
                            "&:focus-visible": {
                              outline: `2px solid ${themedColors.primary}`,
                              outlineOffset: -2,
                            },
                            animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`,
                            "@keyframes fadeIn": {
                              from: {
                                opacity: 0,
                                transform: "translateY(8px)",
                              },
                              to: {
                                opacity: 1,
                                transform: "translateY(0)",
                              },
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              ...commonStyles.dataCell,
                              color: themedColors.textPrimary,
                              py: 2.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {m.first_name} {m.last_name}
                              <ItemTraceIcon
                                table="MemberOfParliament"
                                pkName="personId"
                                pkValue={String(m.person_id)}
                                label={`${m.first_name} ${m.last_name}`}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            {m.party_name ? (
                              <Chip
                                label={m.party_name}
                                size="small"
                                sx={{
                                  background: themedColors.primary,
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  height: 28,
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2.5 }}>
                            {m.is_in_government === 1 ? (
                              <CheckCircleIcon
                                sx={{
                                  color: themedColors.success,
                                  fontSize: 28,
                                }}
                                titleAccess="Hallituksessa"
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.gender}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.birth_date}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.birth_place}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.profession}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Fade>
      )}

      {/* Dialog */}
      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
        selectedDate={date}
      />
    </Box>
  );
};
