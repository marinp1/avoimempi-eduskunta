import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import {
  DataCard,
  EmptyState,
  InlineSpinner,
  MetricCard,
  PageIntro,
} from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { VotingCard, type VotingCardData, VotingGroupCard } from "#client/components/VotingCard";
import { VotingsControlBar } from "./components/VotingsControlBar";
import {
  buildVotingViewModels,
  getNextVisibleGroupCount,
  getVisibleGroups,
  groupVotingViewModels,
  hasMoreGroups,
  isCloseVote,
  type VotingGroupViewModel,
  type VotingListRow,
} from "./model";
import type { VotingSortMode } from "./url-state";

type BrowseState = {
  loading: boolean;
  error: string | null;
  rows: VotingListRow[];
};

type FocusVotingState = {
  loading: boolean;
  error: string | null;
  row: VotingListRow | null;
};

type VotingOverviewResponse = ApiRouteResponse<`/api/votings/overview`>;

type OverviewState = {
  loading: boolean;
  error: string | null;
  data: VotingOverviewResponse | null;
};

const RESULT_GROUP_BATCH = 24;
const OVERVIEW_GROUP_LIMIT = 4;

const emptyBrowseState: BrowseState = { loading: false, error: null, rows: [] };
const emptyFocusState: FocusVotingState = {
  loading: false,
  error: null,
  row: null,
};
const emptyOverviewState: OverviewState = {
  loading: false,
  error: null,
  data: null,
};

const renderGroups = (groups: VotingGroupViewModel[]) =>
  groups.map((group) =>
    group.votes.length === 1 ? (
      <VotingCard key={group.id} voting={group.votes[0] as VotingCardData} />
    ) : (
      <VotingGroupCard key={group.id} votes={group.votes as VotingCardData[]} />
    ),
  );

const OverviewSection: React.FC<{
  title: string;
  description: string;
  groups: VotingGroupViewModel[];
}> = ({ title, description, groups }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    setExpanded(false);
  }, [groups]);

  const visibleGroups = React.useMemo(
    () => (expanded ? groups : getVisibleGroups(groups, OVERVIEW_GROUP_LIMIT)),
    [expanded, groups],
  );

  return (
    <DataCard sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {description}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={groups.length}
            sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", sm: "auto" } }}
          />
        </Box>

        {visibleGroups.length === 0 ? (
          <EmptyState title={title} description={description} />
        ) : (
          <Stack spacing={1.25}>{renderGroups(visibleGroups)}</Stack>
        )}

        {!expanded && hasMoreGroups(groups, OVERVIEW_GROUP_LIMIT) && (
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Button size="small" onClick={() => setExpanded(true)}>
              {tCommon("showMore")}
            </Button>
          </Box>
        )}
      </Stack>
    </DataCard>
  );
};

export const VoteResults: React.FC<{
  query: string;
  searchValue: string;
  focusVotingId?: number | null;
  sessionFilter: string;
  phaseFilter: string;
  sortMode: VotingSortMode;
  onSearchChange: (value: string) => void;
  onSessionFilterChange: (value: string) => void;
  onPhaseFilterChange: (value: string) => void;
  onSortModeChange: (value: VotingSortMode) => void;
  onFocusVotingChange: (value: number | null) => void;
  onClearFilters: () => void;
}> = ({
  query,
  searchValue,
  focusVotingId,
  sessionFilter,
  phaseFilter,
  sortMode,
  onSearchChange,
  onSessionFilterChange,
  onPhaseFilterChange,
  onSortModeChange,
  onFocusVotingChange,
  onClearFilters,
}) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tErrors } = useScopedTranslation("errors");
  const { t: tVotings } = useScopedTranslation("votings");
  const { selectedHallituskausi } = useHallituskausi();
  const themedColors = useThemedColors();

  const [browseState, setBrowseState] =
    React.useState<BrowseState>(emptyBrowseState);
  const [focusVoting, setFocusVoting] =
    React.useState<FocusVotingState>(emptyFocusState);
  const [overviewState, setOverviewState] =
    React.useState<OverviewState>(emptyOverviewState);
  const [visibleResultGroupCount, setVisibleResultGroupCount] =
    React.useState(RESULT_GROUP_BATCH);

  const resultsSentinelRef = React.useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim();
  const hasEnoughQuery = normalizedQuery.length >= 3;
  const filtersActive = phaseFilter !== "all" || sessionFilter !== "all";
  const isOverviewMode = !hasEnoughQuery && !filtersActive && !focusVotingId;

  React.useEffect(() => {
    if (!isOverviewMode) {
      setOverviewState(emptyOverviewState);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      setOverviewState({ loading: true, error: null, data: null });
      try {
        const params = new URLSearchParams();
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate) {
            params.set("endDate", selectedHallituskausi.endDate);
          }
        }
        const url =
          `/api/votings/overview${params.toString() ? `?${params.toString()}` : ""}` as `/api/votings/overview?${string}` | "/api/votings/overview";
        const res = await apiFetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setOverviewState({ loading: false, error: null, data });
      } catch (error) {
        if (ac.signal.aborted) return;
        setOverviewState({
          loading: false,
          error:
            error instanceof Error ? error.message : tErrors("unknownError"),
          data: null,
        });
      }
    };

    run();
    return () => ac.abort();
  }, [isOverviewMode, selectedHallituskausi, tErrors]);

  React.useEffect(() => {
    if (isOverviewMode) {
      setBrowseState(emptyBrowseState);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      setBrowseState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const params = new URLSearchParams();
        if (hasEnoughQuery) params.set("q", normalizedQuery);
        if (phaseFilter !== "all") params.set("phase", phaseFilter);
        if (sessionFilter !== "all") params.set("session", sessionFilter);
        params.set("sort", sortMode);
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate) {
            params.set("endDate", selectedHallituskausi.endDate);
          }
        }
        const res = await apiFetch(`/api/votings/browse?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const rows = await res.json();
        setBrowseState({ loading: false, error: null, rows });
      } catch (error) {
        if (ac.signal.aborted) return;
        setBrowseState({
          loading: false,
          error:
            error instanceof Error ? error.message : tErrors("unknownError"),
          rows: [],
        });
      }
    };

    run();
    return () => ac.abort();
  }, [
    hasEnoughQuery,
    isOverviewMode,
    normalizedQuery,
    phaseFilter,
    selectedHallituskausi,
    sessionFilter,
    sortMode,
    tErrors,
  ]);

  React.useEffect(() => {
    if (!focusVotingId) {
      setFocusVoting(emptyFocusState);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      setFocusVoting({ loading: true, error: null, row: null });
      try {
        const res = await apiFetch(`/api/votings/${focusVotingId}`, {
          signal: ac.signal,
        });
        if (res.status === 404) {
          setFocusVoting({
            loading: false,
            error: tErrors("loadFailedWithReason", {
              reason: tCommon("none"),
            }),
            row: null,
          });
          return;
        }
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const row = await res.json();
        setFocusVoting({ loading: false, error: null, row });
      } catch (error) {
        if (ac.signal.aborted) return;
        setFocusVoting({
          loading: false,
          error:
            error instanceof Error ? error.message : tErrors("unknownError"),
          row: null,
        });
      }
    };

    run();
    return () => ac.abort();
  }, [focusVotingId, tCommon, tErrors]);

  const combinedRows = React.useMemo(() => {
    const rows = [...browseState.rows];
    if (focusVoting.row && !rows.some((row) => row.id === focusVoting.row?.id)) {
      rows.unshift(focusVoting.row);
    }
    return rows.filter((row) => {
      if (!selectedHallituskausi) return true;
      return isDateWithinHallituskausi(
        row.start_time ?? "",
        selectedHallituskausi,
      );
    });
  }, [browseState.rows, focusVoting.row, selectedHallituskausi]);

  const combinedViewModels = React.useMemo(
    () => buildVotingViewModels(combinedRows),
    [combinedRows],
  );

  const groupedResults = React.useMemo(
    () => groupVotingViewModels(combinedViewModels),
    [combinedViewModels],
  );

  const overviewGroups = React.useMemo(() => {
    if (!overviewState.data) {
      return {
        recent: [] as VotingGroupViewModel[],
        close: [] as VotingGroupViewModel[],
        turnout: [] as VotingGroupViewModel[],
      };
    }

    return {
      recent: groupVotingViewModels(
        buildVotingViewModels(overviewState.data.sections.recent),
      ),
      close: groupVotingViewModels(
        buildVotingViewModels(overviewState.data.sections.close),
      ),
      turnout: groupVotingViewModels(
        buildVotingViewModels(overviewState.data.sections.turnout),
      ),
    };
  }, [overviewState.data]);

  const phaseOptions = React.useMemo(() => {
    if (isOverviewMode) {
      return overviewState.data?.facets.phases ?? [];
    }

    return Array.from(
      new Set(
        combinedRows.map((row) => row.section_processing_phase).filter(Boolean),
      ),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value }));
  }, [combinedRows, isOverviewMode, overviewState.data?.facets.phases]);

  const sessionOptions = React.useMemo(() => {
    if (isOverviewMode) {
      return overviewState.data?.facets.sessions ?? [];
    }

    return Array.from(
      new Set(combinedRows.map((row) => row.session_key).filter(Boolean)),
    )
      .sort()
      .reverse()
      .map((value) => ({ value }));
  }, [combinedRows, isOverviewMode, overviewState.data?.facets.sessions]);

  const activeFilters = React.useMemo(
    () =>
      [
        phaseFilter !== "all"
          ? {
              key: "phase",
              label: `${tVotings("filters.phase")}: ${phaseFilter}`,
              onDelete: () => onPhaseFilterChange("all"),
            }
          : null,
        sessionFilter !== "all"
          ? {
              key: "session",
              label: `${tVotings("filters.session")}: ${sessionFilter}`,
              onDelete: () => onSessionFilterChange("all"),
            }
          : null,
        focusVotingId
          ? {
              key: "focus",
              label: tVotings("focusedVoting", { id: focusVotingId }),
              onDelete: () => onFocusVotingChange(null),
            }
          : null,
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        onDelete: () => void;
      }>,
    [
      focusVotingId,
      onFocusVotingChange,
      onPhaseFilterChange,
      onSessionFilterChange,
      phaseFilter,
      sessionFilter,
      tVotings,
    ],
  );

  const searchHint = React.useMemo(() => {
    if (searchValue.trim().length > 0 && searchValue.trim().length < 3) {
      return tVotings("searchNeedsMore");
    }
    if (isOverviewMode) return tVotings("controlHints.overview");
    if (!hasEnoughQuery && filtersActive)
      return tVotings("controlHints.filtersOnly");
    return tVotings("searchHelp");
  }, [
    filtersActive,
    hasEnoughQuery,
    isOverviewMode,
    searchValue,
    tVotings,
  ]);

  const loading =
    overviewState.loading || browseState.loading || focusVoting.loading;
  const error = overviewState.error || browseState.error || focusVoting.error;

  const loadMoreResultGroups = React.useCallback(() => {
    setVisibleResultGroupCount((currentCount) =>
      getNextVisibleGroupCount(
        currentCount,
        groupedResults.length,
        RESULT_GROUP_BATCH,
      ),
    );
  }, [groupedResults.length]);

  React.useEffect(() => {
    setVisibleResultGroupCount(RESULT_GROUP_BATCH);
  }, [
    focusVotingId,
    groupedResults.length,
    hasEnoughQuery,
    isOverviewMode,
    normalizedQuery,
    phaseFilter,
    sessionFilter,
    sortMode,
  ]);

  React.useEffect(() => {
    if (isOverviewMode || !hasMoreGroups(groupedResults, visibleResultGroupCount)) {
      return;
    }

    const sentinel = resultsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreResultGroups();
        }
      },
      {
        rootMargin: "400px 0px",
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    groupedResults,
    isOverviewMode,
    loadMoreResultGroups,
    visibleResultGroupCount,
  ]);

  const visibleResultGroups = React.useMemo(
    () => getVisibleGroups(groupedResults, visibleResultGroupCount),
    [groupedResults, visibleResultGroupCount],
  );

  const applyPhaseQuickFilter = React.useCallback(
    (value: string) => {
      React.startTransition(() => {
        onPhaseFilterChange(value);
        onFocusVotingChange(null);
      });
    },
    [onFocusVotingChange, onPhaseFilterChange],
  );

  const applySessionQuickFilter = React.useCallback(
    (value: string) => {
      React.startTransition(() => {
        onSessionFilterChange(value);
        onFocusVotingChange(null);
      });
    },
    [onFocusVotingChange, onSessionFilterChange],
  );

  return (
    <Box>
      <PageIntro
        title={tVotings("title")}
        subtitle={tVotings("subtitle")}
        eyebrow={tVotings("eyebrow")}
        icon={<HowToVoteOutlinedIcon sx={{ fontSize: 22 }} />}
        chips={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedHallituskausi ? (
              <Chip
                size="small"
                label={tCommon("filteredByGovernmentPeriodLine", {
                  value: selectedHallituskausi.label,
                })}
                sx={{
                  backgroundColor: `${themedColors.primary}10`,
                  color: themedColors.primary,
                  fontWeight: 700,
                }}
              />
            ) : null}
            {!isOverviewMode ? (
              <Chip
                size="small"
                label={tVotings("groupedByDocument")}
                variant="outlined"
                sx={{
                  borderColor: `${themedColors.primary}30`,
                  color: themedColors.primary,
                  fontWeight: 600,
                }}
              />
            ) : null}
          </Stack>
        }
        meta={
          !loading && !error ? (
            <Stack spacing={0.75}>
              {!isOverviewMode ? (
                <Typography variant="body2" sx={{ color: themedColors.textSecondary }}>
                  {tVotings("resultCount", { count: combinedRows.length })}
                </Typography>
              ) : null}
              {activeFilters.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {activeFilters.map((filter) => (
                    <Chip
                      key={filter.key}
                      label={filter.label}
                      onDelete={filter.onDelete}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.82)",
                        color: themedColors.primary,
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Box>
              ) : null}
            </Stack>
          ) : null
        }
        stats={
          !loading && !error && isOverviewMode && overviewState.data ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              <MetricCard
                label={tVotings("overview.metrics.total")}
                value={overviewState.data.metrics.total_votings}
                icon={<HowToVoteOutlinedIcon />}
              />
              <MetricCard
                label={tVotings("overview.metrics.close")}
                value={overviewState.data.metrics.close_votings}
                icon={<FlashOnOutlinedIcon />}
              />
              <MetricCard
                label={tVotings("overview.metrics.latestSession")}
                value={
                  overviewState.data.metrics.latest_session_key ?? tCommon("none")
                }
                icon={<CalendarMonthOutlinedIcon />}
              />
              <MetricCard
                label={tVotings("overview.metrics.phases")}
                value={overviewState.data.metrics.phase_count}
                icon={<CategoryOutlinedIcon />}
              />
            </Box>
          ) : null
        }
        variant="feature"
      />

      <VotingsControlBar
        search={searchValue}
        onSearchChange={onSearchChange}
        searchHint={searchHint}
        sessionFilter={sessionFilter}
        phaseFilter={phaseFilter}
        sortMode={sortMode}
        sessionOptions={sessionOptions}
        phaseOptions={phaseOptions}
        onSessionFilterChange={onSessionFilterChange}
        onPhaseFilterChange={onPhaseFilterChange}
        onSortModeChange={onSortModeChange}
        onClearFilters={onClearFilters}
        showSort={!isOverviewMode}
        activeFilters={activeFilters}
      />

      {loading && <InlineSpinner />}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {tErrors("loadFailedWithReason", { reason: error })}
        </Alert>
      )}

      {!loading && !error && isOverviewMode && overviewState.data && (
        <Stack spacing={2.5}>
          <DataCard sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={1.75}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {tVotings("overview.quickFiltersTitle")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {tVotings("overview.quickFiltersDescription")}
                </Typography>
              </Box>

              <Stack spacing={1.25}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: themedColors.textTertiary,
                      mb: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {tVotings("overview.facets.phase")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {overviewState.data.facets.phases.map((phase) => (
                      <Chip
                        key={phase.value}
                        label={`${phase.value} (${phase.count})`}
                        clickable
                        onClick={() => applyPhaseQuickFilter(phase.value)}
                        sx={{
                          backgroundColor: `${themedColors.primary}08`,
                          color: themedColors.primary,
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: themedColors.textTertiary,
                      mb: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {tVotings("overview.facets.session")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {overviewState.data.facets.sessions.map((session) => (
                      <Chip
                        key={session.value}
                        label={`${session.value} (${session.count})`}
                        clickable
                        onClick={() => applySessionQuickFilter(session.value)}
                        sx={{
                          backgroundColor: "#fff",
                          border: `1px solid ${themedColors.dataBorder}`,
                          color: themedColors.textPrimary,
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Stack>
            </Stack>
          </DataCard>

          <OverviewSection
            title={tVotings("overview.sections.recent.title")}
            description={tVotings("overview.sections.recent.description")}
            groups={overviewGroups.recent}
          />
          <OverviewSection
            title={tVotings("overview.sections.close.title")}
            description={tVotings("overview.sections.close.description")}
            groups={overviewGroups.close}
          />
          <OverviewSection
            title={tVotings("overview.sections.turnout.title")}
            description={tVotings("overview.sections.turnout.description")}
            groups={overviewGroups.turnout}
          />
        </Stack>
      )}

      {!loading && !error && !isOverviewMode && (
        <Box>
          {combinedRows.length === 0 ? (
            <EmptyState
              title={tVotings("noResults")}
              description={
                hasEnoughQuery || filtersActive || focusVotingId
                  ? tVotings("noResultsHint")
                  : tVotings("searchNeedsMore")
              }
              action={
                activeFilters.length > 0 ? (
                  <Button size="small" onClick={onClearFilters}>
                    {tVotings("clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Stack spacing={1.5}>
              {renderGroups(visibleResultGroups)}
              {hasMoreGroups(groupedResults, visibleResultGroupCount) && (
                <>
                  <Box ref={resultsSentinelRef} sx={{ height: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
                    <Button size="small" onClick={loadMoreResultGroups}>
                      {tCommon("showMore")}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          )}

          {combinedRows.length > 0 &&
            searchValue.trim().length > 0 &&
            searchValue.trim().length < 3 && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1.5,
                  color: themedColors.textTertiary,
                }}
              >
                {tVotings("searchNeedsMore")}
              </Typography>
            )}
        </Box>
      )}

      {!loading &&
        !error &&
        isOverviewMode &&
        !overviewState.data &&
        !overviewState.loading && (
          <EmptyState
            title={tVotings("overview.emptyTitle")}
            description={tVotings("overview.emptyDescription")}
          />
        )}

      {!loading &&
        !error &&
        isOverviewMode &&
        searchValue.trim().length > 0 &&
        searchValue.trim().length < 3 && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1.5,
              color: themedColors.textTertiary,
            }}
          >
            {tVotings("searchNeedsMore")}
          </Typography>
        )}

      {!loading &&
        !error &&
        !isOverviewMode &&
        combinedRows.length > 0 &&
        filtersActive &&
        !hasEnoughQuery && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1.5,
              color: themedColors.textTertiary,
            }}
          >
            {tVotings("filterOnlyResultsHint")}
          </Typography>
        )}

      {!loading &&
        !error &&
        !isOverviewMode &&
        combinedRows.length > 0 &&
        combinedRows.some((row) => isCloseVote(row)) &&
        sortMode !== "closest" && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.75,
              color: themedColors.textTertiary,
            }}
          >
            {tVotings("closeVoteHint")}
          </Typography>
        )}
    </Box>
  );
};
