import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import SearchIcon from "@mui/icons-material/Search";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import {
  Alert,
  Box,
  Button,
  CardActionArea,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
import React from "react";
import { TraceRegistration } from "#client/context/TraceContext";
import {
  type HallituskausiPeriod,
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, commonStyles, spacing } from "#client/theme";
import {
  DataCard,
  EmptyState,
  PageIntro,
  ToolbarCard,
} from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { warnInDevelopment } from "#client/utils/request-errors";
import { RepresentativeDetails, type RepresentativeSelection } from "./Details";
import {
  buildCompositionUrl,
  buildPartySummaries,
  type CompositionBrowserView,
  type CompositionSortValue,
  calculateAgeAtDate,
  formatFinnishDate,
  type GovernmentFilterValue,
  getActivationDateForSearchResult,
  getMemberStartDate,
  type MemberWithExtras,
  type PersonLookupResult,
  toRepresentativeSelectionFromMember,
  toRepresentativeSelectionFromSearchResult,
} from "./helpers";

const LOOKUP_DEBOUNCE_MS = 250;

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
      (min, period) => (period.startDate < min ? period.startDate : min),
      hallituskaudet[0]?.startDate ?? "2000-01-01",
    );
  const rangeEnd = selectedHallituskausi?.endDate ?? todayIso;

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const span = endMs - startMs;

  if (span <= 0 || hallituskaudet.length === 0) return null;

  const toMs = (value: string) => new Date(value).getTime();
  const toDate = (value: number) => new Date(value).toISOString().split("T")[0];
  const toPct = (value: string) =>
    Math.max(0, Math.min(100, ((toMs(value) - startMs) / span) * 100));

  const visible = hallituskaudet
    .filter(
      (period) =>
        period.startDate <= rangeEnd &&
        (period.endDate ?? todayIso) >= rangeStart,
    )
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const minTimelineWidth = Math.max(visible.length * 88, 720);

  type Segment =
    | {
        kind: "period";
        period: HallituskausiPeriod;
        duration: number;
        idx: number;
      }
    | { kind: "gap"; duration: number }
    | {
        kind: "overlap";
        duration: number;
        prev: HallituskausiPeriod;
        curr: HallituskausiPeriod;
      };

  const segments: Segment[] = [];
  let cursor = startMs;
  for (let index = 0; index < visible.length; index++) {
    const period = visible[index];
    const periodStart = Math.max(toMs(period.startDate), startMs);
    const periodEnd = Math.min(toMs(period.endDate ?? todayIso), endMs);

    if (periodStart < cursor) {
      const overlapDuration = cursor - periodStart;
      const previousPeriod = visible[index - 1];
      if (overlapDuration > 2 * 86_400_000 && previousPeriod) {
        segments.push({
          kind: "overlap",
          duration: overlapDuration,
          prev: previousPeriod,
          curr: period,
        });
      }
      if (periodEnd > cursor) {
        segments.push({
          kind: "period",
          period,
          duration: periodEnd - cursor,
          idx: index,
        });
        cursor = periodEnd;
      }
    } else {
      if (periodStart > cursor) {
        segments.push({ kind: "gap", duration: periodStart - cursor });
      }
      if (periodEnd > periodStart) {
        segments.push({
          kind: "period",
          period,
          duration: periodEnd - periodStart,
          idx: index,
        });
        cursor = periodEnd;
      }
    }
  }

  if (cursor < endMs) {
    segments.push({ kind: "gap", duration: endMs - cursor });
  }

  const startYear = new Date(rangeStart).getFullYear();
  const endYear = new Date(rangeEnd).getFullYear();
  const yearSpan = endYear - startYear;
  const yearStep = yearSpan <= 5 ? 1 : yearSpan <= 10 ? 2 : 4;
  const yearTicks: number[] = [];
  for (let year = startYear + 1; year <= endYear; year++) {
    if ((year - startYear) % yearStep === 0) {
      const pct = toPct(`${year}-01-01`);
      if (pct > 2 && pct < 98) yearTicks.push(year);
    }
  }

  const currentMs = Math.max(startMs, Math.min(endMs, toMs(date)));

  return (
    <Box sx={{ overflowX: "auto", pb: 0.5, scrollbarWidth: "thin" }}>
      <Box sx={{ minWidth: minTimelineWidth }}>
        <Box
          sx={{
            display: "flex",
            height: 28,
            borderRadius: 1,
            overflow: "hidden",
            border: `1px solid ${tc.dataBorder}`,
            background: tc.backgroundPaper,
          }}
        >
          {segments.map((segment, index) => {
            if (segment.kind === "gap") {
              return (
                <Box
                  key={`gap-${index}`}
                  sx={{
                    flexGrow: segment.duration,
                    flexBasis: 0,
                    flexShrink: 1,
                  }}
                />
              );
            }

            if (segment.kind === "overlap") {
              return (
                <Tooltip
                  key={`overlap-${index}`}
                  title={`${segment.prev.label}\n${segment.curr.label}`}
                  arrow
                >
                  <Box
                    sx={{
                      flexGrow: segment.duration,
                      flexBasis: 0,
                      flexShrink: 1,
                      bgcolor: `${tc.warning}30`,
                      borderLeft: `1px solid ${tc.warning}60`,
                      borderRight: `1px solid ${tc.warning}60`,
                    }}
                  />
                </Tooltip>
              );
            }

            const isSelected = selectedHallituskausi?.id === segment.period.id;
            return (
              <Box
                key={segment.period.id}
                onClick={() =>
                  onDateChange(
                    segment.period.startDate > rangeStart
                      ? segment.period.startDate
                      : rangeStart,
                  )
                }
                sx={{
                  flexGrow: segment.duration,
                  flexBasis: 0,
                  flexShrink: 1,
                  minWidth: 84,
                  px: 0.75,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  bgcolor: isSelected
                    ? `${tc.primary}18`
                    : segment.idx % 2 === 0
                      ? `${tc.primary}08`
                      : `${tc.primary}03`,
                  borderRight: `1px solid ${tc.dataBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? tc.primary : tc.textTertiary,
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {segment.period.name}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ px: 0.75 }}>
          <Slider
            value={currentMs}
            min={startMs}
            max={endMs}
            step={86_400_000}
            onChange={(_, value) => onDateChange(toDate(value as number))}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatFinnishDate(toDate(value))}
            sx={{
              py: "6px !important",
              color: tc.primary,
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
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

        <Box sx={{ position: "relative", height: 14 }}>
          {yearTicks.map((year) => (
            <Typography
              key={year}
              sx={{
                position: "absolute",
                left: `${toPct(`${year}-01-01`)}%`,
                transform: "translateX(-50%)",
                top: 0,
                fontSize: "0.62rem",
                color: tc.textTertiary,
                lineHeight: 1,
              }}
            >
              {year}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const BrowserToggleButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ active, onClick, icon }) => (
  <IconButton
    size="small"
    onClick={onClick}
    sx={{
      border: `1px solid ${active ? colors.primary : colors.dataBorder}`,
      bgcolor: active ? `${colors.primary}10` : "transparent",
      color: active ? colors.primary : colors.textSecondary,
      borderRadius: 1,
    }}
  >
    {icon}
  </IconButton>
);

const readUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  const personParam = params.get("person");
  const viewParam = params.get("view");

  return {
    date:
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : new Date().toISOString().split("T")[0],
    personId: personParam ? Number.parseInt(personParam, 10) : null,
    query: params.get("q") ?? "",
    view: viewParam === "table" ? "table" : "list",
  } as const;
};

const getStatusColor = (governmentCount: number, oppositionCount: number) => {
  if (governmentCount > 0 && oppositionCount === 0) return colors.success;
  if (oppositionCount > 0 && governmentCount === 0) return colors.warning;
  return colors.primary;
};

const getPartyBlocLabel = (
  t: ReturnType<typeof useScopedTranslation>["t"],
  governmentCount: number,
  oppositionCount: number,
) => {
  if (governmentCount > 0 && oppositionCount === 0) {
    return t("partyMatrix.government");
  }
  if (oppositionCount > 0 && governmentCount === 0) {
    return t("partyMatrix.opposition");
  }
  return t("partyMatrix.mixed");
};

const fetchRepresentativeSelection = async (
  personId: number,
  signal?: AbortSignal,
): Promise<RepresentativeSelection> => {
  const [detailsResponse, membershipsResponse] = await Promise.all([
    apiFetch(`/api/person/${personId}/details`, { signal }),
    apiFetch(`/api/person/${personId}/group-memberships`, { signal }),
  ]);
  if (!detailsResponse.ok || !membershipsResponse.ok) {
    throw new Error(
      `HTTP ${detailsResponse.ok ? membershipsResponse.status : detailsResponse.status}`,
    );
  }

  const details = await detailsResponse.json();
  const memberships = await membershipsResponse.json();
  const latestMembership = memberships.at(-1);

  return {
    personId,
    summary: {
      firstName: details?.first_name,
      lastName: details?.last_name,
      partyName: latestMembership?.group_name ?? null,
      isInGovernment: null,
    },
  };
};

export default () => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const { hallituskaudet, selectedHallituskausi, setSelectedHallituskausiId } =
    useHallituskausi();

  const initialUrlState = React.useMemo(() => readUrlState(), []);
  const [members, setMembers] = React.useState<MemberWithExtras[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(initialUrlState.date);
  const [selectedRepresentative, setSelectedRepresentative] =
    React.useState<RepresentativeSelection | null>(null);
  const [selectedPersonId, setSelectedPersonId] = React.useState<number | null>(
    initialUrlState.personId,
  );
  const [dialogOpen, setDialogOpen] = React.useState(
    initialUrlState.personId !== null,
  );
  const [partyFilter, setPartyFilter] = React.useState<string | null>(null);
  const [govFilter, setGovFilter] =
    React.useState<GovernmentFilterValue>("all");
  const [compositionSearch, setCompositionSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<CompositionSortValue>("party");
  const [viewMode, setViewMode] = React.useState<CompositionBrowserView>(
    initialUrlState.view,
  );
  const [lookupQuery, setLookupQuery] = React.useState(initialUrlState.query);
  const [committedLookupQuery, setCommittedLookupQuery] = React.useState(
    initialUrlState.query.trim(),
  );
  const [lookupResults, setLookupResults] = React.useState<
    PersonLookupResult[]
  >([]);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [lookupSelectionMessage, setLookupSelectionMessage] = React.useState<
    string | null
  >(null);

  const todayIso = new Date().toISOString().split("T")[0];
  const isToday = date === todayIso;

  const syncUrl = React.useCallback(
    (
      updates: {
        date?: string | null;
        person?: number | null;
        q?: string | null;
        view?: CompositionBrowserView | null;
      },
      mode: "push" | "replace" = "push",
    ) => {
      const nextUrl = buildCompositionUrl(
        window.location.pathname,
        window.location.search,
        {
          date: updates.date,
          person:
            updates.person === undefined
              ? undefined
              : updates.person === null
                ? null
                : String(updates.person),
          q: updates.q,
          view: updates.view,
        },
      );

      if (mode === "replace") {
        window.history.replaceState({}, "", nextUrl);
      } else {
        window.history.pushState({}, "", nextUrl);
      }
    },
    [],
  );

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCommittedLookupQuery(lookupQuery.trim());
    }, LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [lookupQuery]);

  React.useEffect(() => {
    syncUrl({ q: committedLookupQuery || null }, "replace");
  }, [committedLookupQuery, syncUrl]);

  React.useEffect(() => {
    syncUrl({ view: viewMode === "list" ? null : viewMode }, "replace");
  }, [viewMode, syncUrl]);

  React.useEffect(() => {
    const controller = new AbortController();
    const loadMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(`/api/composition/${date}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (controller.signal.aborted) return;
        setMembers(data);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        warnInDevelopment("Failed to fetch composition members", loadError);
        console.error(loadError);
        setError(t("loadError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadMembers();
    return () => controller.abort();
  }, [date, t]);

  React.useEffect(() => {
    if (committedLookupQuery.length < 2) {
      setLookupResults([]);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadResults = async () => {
      try {
        setLookupLoading(true);
        setLookupError(null);
        const response = await apiFetch(
          `/api/person/search?q=${encodeURIComponent(
            committedLookupQuery,
          )}&date=${date}&limit=18`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!controller.signal.aborted) {
          setLookupResults(data);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          "Failed to fetch composition lookup results",
          loadError,
        );
        console.error(loadError);
        setLookupResults([]);
        setLookupError(t("globalSearch.loadError"));
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    };

    loadResults();
    return () => controller.abort();
  }, [committedLookupQuery, date, t]);

  React.useEffect(() => {
    const handlePopState = () => {
      const next = readUrlState();
      setDate(next.date);
      setLookupQuery(next.query);
      setCommittedLookupQuery(next.query.trim());
      setSelectedPersonId(next.personId);
      setDialogOpen(next.personId !== null);
      setViewMode(next.view);
      if (next.personId === null) {
        setSelectedRepresentative(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (!selectedHallituskausi) return;
    if (isDateWithinHallituskausi(date, selectedHallituskausi)) return;
    const fallback =
      date < selectedHallituskausi.startDate
        ? selectedHallituskausi.startDate
        : selectedHallituskausi.endDate || selectedHallituskausi.startDate;
    setDate(fallback);
    syncUrl({ date: fallback }, "replace");
  }, [date, selectedHallituskausi, syncUrl]);

  React.useEffect(() => {
    if (!selectedPersonId) {
      setLookupSelectionMessage(null);
      return;
    }

    const controller = new AbortController();
    const currentMember = members.find(
      (member) => member.person_id === selectedPersonId,
    );
    if (currentMember) {
      setLookupSelectionMessage(null);
      setSelectedRepresentative(
        toRepresentativeSelectionFromMember(currentMember),
      );
      return;
    }

    const currentLookupMatch = lookupResults.find(
      (result) => result.person_id === selectedPersonId,
    );
    if (currentLookupMatch) {
      setLookupSelectionMessage(null);
      setSelectedRepresentative(
        toRepresentativeSelectionFromSearchResult(currentLookupMatch),
      );
      return;
    }

    fetchRepresentativeSelection(selectedPersonId, controller.signal)
      .then((selection) => {
        if (!controller.signal.aborted) {
          setSelectedRepresentative(selection);
          setLookupSelectionMessage(null);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch representative selection for ${selectedPersonId}`,
          err,
        );
        setSelectedRepresentative({ personId: selectedPersonId });
        setLookupSelectionMessage(t("globalSearch.selectionFallback"));
      });

    return () => controller.abort();
  }, [lookupResults, members, selectedPersonId, t]);

  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const governmentMembers = members.filter(
      (member) => member.is_in_government === 1,
    ).length;
    const oppositionMembers = totalMembers - governmentMembers;
    const partySummaries = buildPartySummaries(members);
    const womenCount = members.filter((member) =>
      member.gender.toLowerCase().startsWith("n"),
    ).length;
    const menCount = members.filter((member) =>
      member.gender.toLowerCase().startsWith("m"),
    ).length;

    return {
      totalMembers,
      governmentMembers,
      oppositionMembers,
      partyCount: partySummaries.length,
      largestParty: partySummaries[0] ?? null,
      womenCount,
      menCount,
      partySummaries,
    };
  }, [members]);

  const filteredMembers = React.useMemo(() => {
    const q = compositionSearch.trim().toLowerCase();
    const sorted = [...members].filter((member) => {
      if (
        q &&
        !`${member.first_name} ${member.last_name}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (partyFilter && member.party_name !== partyFilter) {
        return false;
      }
      if (govFilter === "government" && member.is_in_government !== 1) {
        return false;
      }
      if (govFilter === "opposition" && member.is_in_government === 1) {
        return false;
      }
      return true;
    });

    sorted.sort((left, right) => {
      if (sortBy === "party") {
        return (
          (left.party_name ?? "").localeCompare(right.party_name ?? "") ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      if (sortBy === "age") {
        return (
          calculateAgeAtDate(right.birth_date, date) -
            calculateAgeAtDate(left.birth_date, date) ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      if (sortBy === "tenure") {
        return (
          getMemberStartDate(left).localeCompare(getMemberStartDate(right)) ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      return left.sort_name.localeCompare(right.sort_name);
    });

    return sorted;
  }, [compositionSearch, date, govFilter, members, partyFilter, sortBy]);

  React.useEffect(() => {
    if (!partyFilter) return;
    if (members.some((member) => member.party_name === partyFilter)) return;
    setPartyFilter(null);
  }, [members, partyFilter]);

  const openRepresentative = React.useCallback(
    (selection: RepresentativeSelection, nextDate?: string) => {
      if (nextDate && nextDate !== date) {
        setDate(nextDate);
      }
      setSelectedPersonId(selection.personId);
      setSelectedRepresentative(selection);
      setDialogOpen(true);
      syncUrl({
        date: nextDate && nextDate !== date ? nextDate : undefined,
        person: selection.personId,
      });
    },
    [date, syncUrl],
  );

  const handleDateChange = React.useCallback(
    (nextDate: string) => {
      if (
        selectedHallituskausi &&
        !isDateWithinHallituskausi(nextDate, selectedHallituskausi)
      ) {
        const clamped =
          nextDate < selectedHallituskausi.startDate
            ? selectedHallituskausi.startDate
            : selectedHallituskausi.endDate || nextDate;
        setDate(clamped);
        syncUrl({ date: clamped });
        return;
      }
      setDate(nextDate);
      syncUrl({ date: nextDate });
    },
    [selectedHallituskausi, syncUrl],
  );

  const handleResetToPresent = React.useCallback(() => {
    setDate(todayIso);
    setSelectedHallituskausiId("");
    syncUrl({ date: todayIso });
  }, [setSelectedHallituskausiId, syncUrl, todayIso]);

  const handleLookupResultClick = React.useCallback(
    (result: PersonLookupResult) => {
      const activationDate = getActivationDateForSearchResult(result, date);
      const currentMemberAtActivationDate = members.find(
        (member) => member.person_id === result.person_id,
      );

      if (
        result.is_active_on_selected_date !== 1 &&
        result.latest_active_date &&
        result.latest_active_date !== date
      ) {
        setLookupSelectionMessage(
          t("globalSearch.adjustedDateHint", {
            value: formatFinnishDate(result.latest_active_date),
          }),
        );
      } else {
        setLookupSelectionMessage(null);
      }

      openRepresentative(
        currentMemberAtActivationDate
          ? toRepresentativeSelectionFromMember(currentMemberAtActivationDate)
          : toRepresentativeSelectionFromSearchResult(result),
        activationDate,
      );
    },
    [date, members, openRepresentative, t],
  );

  const handleMemberClick = React.useCallback(
    (member: MemberWithExtras) => {
      setLookupSelectionMessage(null);
      openRepresentative(toRepresentativeSelectionFromMember(member));
    },
    [openRepresentative],
  );

  const handleCloseDialog = React.useCallback(() => {
    setDialogOpen(false);
    setSelectedPersonId(null);
    setSelectedRepresentative(null);
    syncUrl({ person: null });
  }, [syncUrl]);

  return (
    <Box>
      <PageIntro
        title={t("title")}
        summary={
          selectedHallituskausi
            ? t("summaryGovernment", {
                period: selectedHallituskausi.name,
                value: formatFinnishDate(date),
              })
            : isToday
              ? t("summaryCurrent", { value: formatFinnishDate(date) })
              : t("summaryHistorical", { value: formatFinnishDate(date) })
        }
        mobileMode="compact"
        mobileAnchorId="composition-content"
        mobileStatsPlacement="hidden"
        mobileSummary={
          !loading && !error ? (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={`${t("snapshot.totalMembers")}: ${stats.totalMembers}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${t("snapshot.partyCount")}: ${stats.partyCount}`}
                sx={{ fontWeight: 700 }}
              />
            </Box>
          ) : undefined
        }
        utility={
          <Button
            variant="outlined"
            size="small"
            onClick={handleResetToPresent}
            sx={{
              ...commonStyles.compactOutlinedPrimaryButton,
              alignSelf: { xs: "stretch", md: "flex-start" },
            }}
          >
            {t("returnToPresent")}
          </Button>
        }
        chips={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={t("details.analysis.selectedDate", {
                value: formatFinnishDate(date),
              })}
              sx={{ fontWeight: 600 }}
            />
            {selectedHallituskausi ? (
              <Chip
                size="small"
                icon={<AccountBalanceIcon sx={{ fontSize: 14 }} />}
                label={selectedHallituskausi.name}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
            {!selectedHallituskausi ? (
              <Chip
                size="small"
                icon={
                  isToday ? (
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <HistoryEduIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={isToday ? t("context.current") : t("historicalView")}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
          </Stack>
        }
      />

      <Box id="composition-content">
        <ToolbarCard sx={{ mb: spacing.md }}>
          <TimelineSelector
            hallituskaudet={hallituskaudet}
            selectedHallituskausi={selectedHallituskausi}
            date={date}
            todayIso={todayIso}
            onDateChange={handleDateChange}
          />
        </ToolbarCard>
      </Box>

      <DataCard sx={{ p: 2.5, mb: spacing.md }}>
        <Typography
          variant="h6"
          sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
        >
          {t("globalSearch.title")}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: themedColors.textSecondary, mb: 2 }}
        >
          {t("globalSearch.description")}
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder={t("globalSearch.placeholder")}
          value={lookupQuery}
          onChange={(event) => setLookupQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: lookupQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setLookupQuery("")}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {lookupLoading && <LinearProgress sx={{ mt: 1.5 }} />}
        {lookupSelectionMessage && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {lookupSelectionMessage}
          </Alert>
        )}
        {lookupError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {lookupError}
          </Alert>
        )}

        {committedLookupQuery.length < 2 ? (
          <EmptyState
            title={t("globalSearch.startTitle")}
            description={t("globalSearch.startHint")}
            sx={{ mt: 2 }}
          />
        ) : lookupResults.length === 0 && !lookupLoading ? (
          <EmptyState
            title={t("globalSearch.noResults")}
            description={t("globalSearch.noResultsHint")}
            sx={{ mt: 2 }}
          />
        ) : (
          <Box
            sx={{
              mt: 1.5,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1,
            }}
          >
            {lookupResults.map((result) => (
              <CardActionArea
                key={result.person_id}
                onClick={() => handleLookupResultClick(result)}
                sx={{
                  borderRadius: 1.5,
                  border: `1px solid ${
                    selectedRepresentative?.personId === result.person_id
                      ? themedColors.primary
                      : themedColors.dataBorder
                  }`,
                  background:
                    selectedRepresentative?.personId === result.person_id
                      ? `${themedColors.primary}08`
                      : themedColors.backgroundPaper,
                  px: 1.25,
                  py: 1.25,
                }}
              >
                <Stack spacing={0.75}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: themedColors.textPrimary }}
                    >
                      {result.first_name} {result.last_name}
                    </Typography>
                    {result.is_current_mp === 1 && (
                      <Chip
                        size="small"
                        label={t("globalSearch.badges.current")}
                        sx={{ ...commonStyles.compactChipSm }}
                      />
                    )}
                    {result.is_active_on_selected_date === 1 && (
                      <Chip
                        size="small"
                        label={t("globalSearch.badges.activeOnDate")}
                        sx={{ ...commonStyles.compactChipSm }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {result.latest_party_name || t("details.unknownParty")}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textTertiary }}
                  >
                    {t("globalSearch.termRange", {
                      start: result.first_term_start
                        ? formatFinnishDate(result.first_term_start)
                        : "?",
                      end: result.last_term_end
                        ? formatFinnishDate(result.last_term_end)
                        : t("details.ongoing"),
                    })}
                  </Typography>
                </Stack>
              </CardActionArea>
            ))}
          </Box>
        )}
      </DataCard>

      {loading ? (
        <Box sx={{ mb: spacing.md }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                xl: "repeat(5, 1fr)",
              },
              gap: 2,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={112}
                animation="wave"
              />
            ))}
          </Box>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: spacing.md }}>
          {error}
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" },
              gap: 2,
              mb: spacing.md,
            }}
          >
            <DataCard sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: themedColors.textPrimary,
                      fontWeight: 700,
                      mb: 0.5,
                    }}
                  >
                    {t("distribution.title")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {t("distribution.description")}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={t("snapshot.genderSplit", {
                      women: stats.womenCount,
                      men: stats.menCount,
                    })}
                  />
                  {stats.largestParty && (
                    <Chip
                      size="small"
                      label={t("snapshot.leadingPartySeats", {
                        party: stats.largestParty.partyName,
                        count: stats.largestParty.total,
                      })}
                    />
                  )}
                </Stack>
              </Stack>
              <Box
                sx={{
                  display: "flex",
                  height: 18,
                  overflow: "hidden",
                  borderRadius: 999,
                  border: `1px solid ${themedColors.dataBorder}`,
                  background: themedColors.backgroundSubtle,
                }}
              >
                {stats.partySummaries.map((party) => (
                  <Tooltip
                    key={party.partyName}
                    title={`${party.partyName}: ${party.total} ${t("distribution.seats")}`}
                    arrow
                  >
                    <Box
                      onClick={() =>
                        setPartyFilter((current) =>
                          current === party.partyName ? null : party.partyName,
                        )
                      }
                      sx={{
                        flex: party.total,
                        minWidth: party.total <= 2 ? 8 : 0,
                        cursor: "pointer",
                        bgcolor: getStatusColor(
                          party.government,
                          party.opposition,
                        ),
                        opacity:
                          partyFilter && partyFilter !== party.partyName
                            ? 0.45
                            : 1,
                        transition: "opacity 150ms ease",
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <Box
                sx={{
                  mt: 1.5,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    background: themedColors.backgroundSubtle,
                    border: `1px solid ${themedColors.dataBorder}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary, display: "block" }}
                  >
                    {t("snapshot.governmentMembers")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: colors.success, fontWeight: 700 }}
                  >
                    {stats.governmentMembers}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    background: themedColors.backgroundSubtle,
                    border: `1px solid ${themedColors.dataBorder}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary, display: "block" }}
                  >
                    {t("snapshot.oppositionMembers")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: colors.warning, fontWeight: 700 }}
                  >
                    {stats.oppositionMembers}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    background: themedColors.backgroundSubtle,
                    border: `1px solid ${themedColors.dataBorder}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary, display: "block" }}
                  >
                    {t("distribution.majorityLine")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
                  >
                    {Math.max(0, 101 - stats.governmentMembers)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    background: themedColors.backgroundSubtle,
                    border: `1px solid ${themedColors.dataBorder}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary, display: "block" }}
                  >
                    {t("distribution.topThreeLine")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
                  >
                    {stats.partySummaries
                      .slice(0, 3)
                      .map((party) => `${party.partyName} ${party.total}`)
                      .join(" · ")}
                  </Typography>
                </Box>
              </Box>
            </DataCard>

            <DataCard sx={{ p: 2.5 }}>
              <Typography
                variant="h6"
                sx={{ color: themedColors.textPrimary, fontWeight: 700, mb: 1 }}
              >
                {t("partyMatrix.title")}
              </Typography>
              <Stack spacing={1.25}>
                {stats.partySummaries.map((party) => (
                  <CardActionArea
                    key={party.partyName}
                    onClick={() =>
                      setPartyFilter((current) =>
                        current === party.partyName ? null : party.partyName,
                      )
                    }
                    sx={{
                      borderRadius: 1.5,
                      border: `1px solid ${
                        partyFilter === party.partyName
                          ? themedColors.primary
                          : themedColors.dataBorder
                      }`,
                      p: 1.25,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: themedColors.textPrimary,
                            fontWeight: 700,
                          }}
                        >
                          {party.partyName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          {getPartyBlocLabel(
                            t,
                            party.government,
                            party.opposition,
                          )}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: themedColors.textPrimary,
                        }}
                      >
                        {party.total}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={party.share * 100}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 999,
                        bgcolor: themedColors.backgroundSubtle,
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          bgcolor: getStatusColor(
                            party.government,
                            party.opposition,
                          ),
                        },
                      }}
                    />
                  </CardActionArea>
                ))}
              </Stack>
            </DataCard>
          </Box>

          <Box>
            <DataCard sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
                  >
                    {t("browser.title")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {t("browser.description")}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BrowserToggleButton
                    active={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    icon={<ViewAgendaIcon fontSize="small" />}
                  />
                  <BrowserToggleButton
                    active={viewMode === "table"}
                    onClick={() => setViewMode("table")}
                    icon={<TableRowsIcon fontSize="small" />}
                  />
                </Stack>
              </Stack>

              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t("browser.searchPlaceholder")}
                    value={compositionSearch}
                    onChange={(event) =>
                      setCompositionSearch(event.target.value)
                    }
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18 }} />
                          </InputAdornment>
                        ),
                        endAdornment: compositionSearch ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setCompositionSearch("")}
                            >
                              <ClearIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                  />

                  <Select
                    size="small"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as CompositionSortValue)
                    }
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="party">{t("browser.sort.party")}</MenuItem>
                    <MenuItem value="name">{t("browser.sort.name")}</MenuItem>
                    <MenuItem value="age">{t("browser.sort.age")}</MenuItem>
                    <MenuItem value="tenure">
                      {t("browser.sort.tenure")}
                    </MenuItem>
                  </Select>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(["all", "government", "opposition"] as const).map(
                    (value) => (
                      <Chip
                        key={value}
                        size="small"
                        label={
                          value === "all"
                            ? t("details.filters.all")
                            : value === "government"
                              ? t("details.filters.government")
                              : t("details.filters.opposition")
                        }
                        onClick={() => setGovFilter(value)}
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            govFilter === value
                              ? themedColors.primary
                              : themedColors.backgroundPaper,
                          color:
                            govFilter === value
                              ? "white"
                              : themedColors.textSecondary,
                          border: `1px solid ${
                            govFilter === value
                              ? themedColors.primary
                              : themedColors.dataBorder
                          }`,
                        }}
                      />
                    ),
                  )}
                  {partyFilter && (
                    <Chip
                      size="small"
                      color="primary"
                      label={t("browser.partyFilter", { value: partyFilter })}
                      onDelete={() => setPartyFilter(null)}
                    />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: themedColors.textTertiary,
                      ml: "auto",
                      alignSelf: "center",
                    }}
                  >
                    {t("browser.resultCount", {
                      shown: filteredMembers.length,
                      total: members.length,
                    })}
                  </Typography>
                </Stack>
              </Stack>

              {filteredMembers.length === 0 ? (
                <EmptyState
                  title={t("noResults")}
                  description={t("noResultsHint")}
                  action={
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCompositionSearch("");
                        setPartyFilter(null);
                        setGovFilter("all");
                      }}
                    >
                      {t("resetFilters")}
                    </Button>
                  }
                />
              ) : viewMode === "list" ? (
                <Stack spacing={1}>
                  {filteredMembers.map((member) => {
                    const isSelected =
                      selectedRepresentative?.personId === member.person_id;
                    const age = calculateAgeAtDate(member.birth_date, date);
                    return (
                      <CardActionArea
                        key={member.person_id}
                        onClick={() => handleMemberClick(member)}
                        sx={{
                          borderRadius: 1.5,
                          border: `1px solid ${
                            isSelected
                              ? themedColors.primary
                              : themedColors.dataBorder
                          }`,
                          background: isSelected
                            ? `${themedColors.primary}08`
                            : themedColors.backgroundPaper,
                          px: 1.5,
                          py: 1.25,
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.25}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                            >
                              <Typography
                                variant="body1"
                                sx={{
                                  color: themedColors.textPrimary,
                                  fontWeight: 700,
                                }}
                              >
                                {member.first_name} {member.last_name}
                              </Typography>
                            </Stack>
                            <TraceRegistration
                              table="MemberOfParliament"
                              pkName="personId"
                              pkValue={String(member.person_id)}
                              label={`${member.first_name} ${member.last_name}`}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: themedColors.textSecondary }}
                            >
                              {member.party_name || t("details.unknownParty")} ·{" "}
                              {member.profession ||
                                t("browser.unknownProfession")}
                            </Typography>
                          </Box>

                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              size="small"
                              label={t("browser.age", { value: age })}
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              size="small"
                              label={t("browser.tenure", {
                                value: formatFinnishDate(
                                  getMemberStartDate(member) || date,
                                ),
                              })}
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              size="small"
                              label={
                                member.is_in_government === 1
                                  ? t("details.filters.government")
                                  : t("details.filters.opposition")
                              }
                              sx={{
                                fontWeight: 700,
                                bgcolor:
                                  member.is_in_government === 1
                                    ? `${colors.success}12`
                                    : `${colors.warning}12`,
                                color:
                                  member.is_in_government === 1
                                    ? colors.success
                                    : colors.warning,
                              }}
                            />
                          </Stack>
                        </Stack>
                      </CardActionArea>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    border: `1px solid ${themedColors.dataBorder}`,
                    borderRadius: 1.5,
                    overflow: "hidden",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={commonStyles.tableHeaderRow}>
                        <TableCell>{t("table.name")}</TableCell>
                        <TableCell>{t("table.party")}</TableCell>
                        <TableCell>{t("table.government")}</TableCell>
                        <TableCell>{t("browser.ageColumn")}</TableCell>
                        <TableCell>{t("table.occupation")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow
                          key={member.person_id}
                          hover
                          onClick={() => handleMemberClick(member)}
                          sx={{
                            cursor: "pointer",
                            "&:last-child td": { borderBottom: 0 },
                            ...(selectedRepresentative?.personId ===
                            member.person_id
                              ? { bgcolor: `${themedColors.primary}08` }
                              : null),
                          }}
                        >
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                            >
                              <Typography sx={{ fontWeight: 700 }}>
                                {member.first_name} {member.last_name}
                              </Typography>
                            </Stack>
                            <TraceRegistration
                              table="MemberOfParliament"
                              pkName="personId"
                              pkValue={String(member.person_id)}
                              label={`${member.first_name} ${member.last_name}`}
                            />
                          </TableCell>
                          <TableCell>{member.party_name || "-"}</TableCell>
                          <TableCell>
                            {member.is_in_government === 1
                              ? t("details.filters.government")
                              : t("details.filters.opposition")}
                          </TableCell>
                          <TableCell>
                            {calculateAgeAtDate(member.birth_date, date)}
                          </TableCell>
                          <TableCell>{member.profession || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataCard>
          </Box>
        </>
      )}

      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
        selectedDate={date}
      />
    </Box>
  );
};
