import {
  Alert,
  Box,
  CircularProgress,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { extractDocumentIdentifiers } from "#client/components/DocumentCards";
import {
  VotingCard,
  type VotingCardData,
  VotingGroupCard,
} from "#client/components/VotingCard";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { commonStyles } from "#client/theme";
import { DataCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type SortMode = "newest" | "oldest" | "closest" | "largest";
type VotingSearchRow = DatabaseQueries.VotingSearchResult;

type SearchState = {
  loading: boolean;
  error: string | null;
  rows: VotingSearchRow[];
};

type FocusVotingState = {
  loading: boolean;
  error: string | null;
  row: VotingSearchRow | null;
};

type RecentState = {
  loading: boolean;
  rows: VotingSearchRow[];
};

const emptyState: SearchState = { loading: false, error: null, rows: [] };
const emptyFocusState: FocusVotingState = {
  loading: false,
  error: null,
  row: null,
};
const emptyRecentState: RecentState = { loading: false, rows: [] };

const voteMargin = (vote: VotingSearchRow) => Math.abs(vote.n_yes - vote.n_no);

const sortRows = (rows: VotingSearchRow[], sortMode: SortMode) => {
  const copy = [...rows];
  switch (sortMode) {
    case "oldest":
      return copy.sort((a, b) =>
        (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
    case "closest":
      return copy.sort((a, b) => voteMargin(a) - voteMargin(b));
    case "largest":
      return copy.sort((a, b) => b.n_total - a.n_total);
    default:
      return copy.sort((a, b) =>
        (b.start_time ?? "").localeCompare(a.start_time ?? ""),
      );
  }
};

/** Get the primary document identifier for grouping (e.g. "HE 45/2024 vp") */
const getDocumentGroupKey = (vote: VotingSearchRow): string | null => {
  const docRefs = extractDocumentIdentifiers([
    vote.parliamentary_item,
    vote.section_title,
    vote.main_section_title,
    vote.agenda_title,
  ]);
  return docRefs.length > 0 ? docRefs[0].identifier : null;
};

export const VoteResults: React.FC<{
  query: string;
  focusVotingId?: number | null;
  initialSessionFilter?: string | null;
}> = ({ query, focusVotingId, initialSessionFilter }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tErrors } = useScopedTranslation("errors");
  const { t: tVotings } = useScopedTranslation("votings");
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  const [state, setState] = React.useState<SearchState>(emptyState);
  const [focusVoting, setFocusVoting] =
    React.useState<FocusVotingState>(emptyFocusState);
  const [recentState, setRecentState] =
    React.useState<RecentState>(emptyRecentState);
  const [phaseFilter, setPhaseFilter] = React.useState<string>("all");
  const [sessionFilter, setSessionFilter] = React.useState<string>(
    initialSessionFilter || "all",
  );
  const [sortMode, setSortMode] = React.useState<SortMode>("newest");

  const normalizedQuery = query.trim();

  React.useEffect(() => {
    setSessionFilter(initialSessionFilter || "all");
  }, [initialSessionFilter]);

  React.useEffect(() => {
    if (!normalizedQuery || normalizedQuery.length < 3) {
      setState(emptyState);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const params = new URLSearchParams({ q: normalizedQuery });
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate) {
            params.set("endDate", selectedHallituskausi.endDate);
          }
        }
        const res = await fetch(`/api/votings/search?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const rows: VotingSearchRow[] = await res.json();
        setState({ loading: false, error: null, rows });
      } catch (error) {
        if (ac.signal.aborted) return;
        setState({
          loading: false,
          error:
            error instanceof Error ? error.message : tErrors("unknownError"),
          rows: [],
        });
      }
    };

    run();
    return () => ac.abort();
  }, [normalizedQuery, selectedHallituskausi, tErrors]);

  React.useEffect(() => {
    if (!focusVotingId) {
      setFocusVoting(emptyFocusState);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      setFocusVoting({ loading: true, error: null, row: null });
      try {
        const res = await fetch(`/api/votings/${focusVotingId}`, {
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
        const row: VotingSearchRow = await res.json();
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
    const rows = [...state.rows];
    if (
      focusVoting.row &&
      !rows.some((row) => row.id === focusVoting.row?.id)
    ) {
      rows.unshift(focusVoting.row);
    }
    return rows;
  }, [state.rows, focusVoting.row]);

  const phases = React.useMemo(
    () =>
      Array.from(
        new Set(combinedRows.map((row) => row.section_processing_phase)),
      ).sort(),
    [combinedRows],
  );

  const sessions = React.useMemo(
    () =>
      Array.from(new Set(combinedRows.map((row) => row.session_key)))
        .sort()
        .reverse(),
    [combinedRows],
  );

  const filtered = React.useMemo(() => {
    const rows = combinedRows.filter((row) => {
      if (
        selectedHallituskausi &&
        !isDateWithinHallituskausi(row.start_time, selectedHallituskausi)
      )
        return false;
      if (phaseFilter !== "all" && row.section_processing_phase !== phaseFilter)
        return false;
      if (sessionFilter !== "all" && row.session_key !== sessionFilter)
        return false;
      return true;
    });
    return sortRows(rows, sortMode);
  }, [
    combinedRows,
    phaseFilter,
    selectedHallituskausi,
    sessionFilter,
    sortMode,
  ]);

  /** Group votings by referenced document (e.g. "HE 45/2024 vp") */
  const grouped = React.useMemo(() => {
    const groups: VotingSearchRow[][] = [];
    const keyToIndex = new Map<string, number>();

    for (const vote of filtered) {
      const key = getDocumentGroupKey(vote);
      if (key) {
        const existingIdx = keyToIndex.get(key);
        if (existingIdx !== undefined) {
          groups[existingIdx].push(vote);
        } else {
          keyToIndex.set(key, groups.length);
          groups.push([vote]);
        }
      } else {
        groups.push([vote]);
      }
    }

    for (const group of groups) {
      if (group.length > 1) {
        group.sort((a, b) =>
          (a.start_time ?? "").localeCompare(b.start_time ?? ""),
        );
      }
    }

    return groups;
  }, [filtered]);

  const noSearch = normalizedQuery.length < 3 && !focusVotingId;

  React.useEffect(() => {
    if (!noSearch) return;
    const ac = new AbortController();
    const run = async () => {
      setRecentState({ loading: true, rows: [] });
      try {
        const params = new URLSearchParams();
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate)
            params.set("endDate", selectedHallituskausi.endDate);
        }
        const url = `/api/votings/recent${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`${res.status}`);
        const rows: VotingSearchRow[] = await res.json();
        setRecentState({ loading: false, rows });
      } catch {
        if (!ac.signal.aborted) setRecentState({ loading: false, rows: [] });
      }
    };
    run();
    return () => ac.abort();
  }, [noSearch, selectedHallituskausi]);

  const recentGrouped = React.useMemo(() => {
    if (!noSearch) return [];
    const groups: VotingSearchRow[][] = [];
    const keyToIndex = new Map<string, number>();
    for (const vote of recentState.rows) {
      const key = getDocumentGroupKey(vote);
      if (key) {
        const existingIdx = keyToIndex.get(key);
        if (existingIdx !== undefined) {
          groups[existingIdx].push(vote);
        } else {
          keyToIndex.set(key, groups.length);
          groups.push([vote]);
        }
      } else {
        groups.push([vote]);
      }
    }
    return groups;
  }, [noSearch, recentState.rows]);

  const renderGroups = (groups: VotingSearchRow[][]) =>
    groups.map((group) =>
      group.length === 1 ? (
        <VotingCard key={group[0].id} voting={group[0] as VotingCardData} />
      ) : (
        <VotingGroupCard
          key={group.map((v) => v.id).join("-")}
          votes={group as VotingCardData[]}
        />
      ),
    );

  return (
    <Box>
      {noSearch && recentState.loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 5,
          }}
        >
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      )}

      {noSearch && !recentState.loading && recentGrouped.length > 0 && (
        <Stack spacing={1.5}>{renderGroups(recentGrouped)}</Stack>
      )}

      {!noSearch && (state.loading || focusVoting.loading) && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      )}

      {!noSearch &&
        !state.loading &&
        !focusVoting.loading &&
        (state.error || focusVoting.error) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {tErrors("loadFailedWithReason", {
              reason: state.error || focusVoting.error,
            })}
          </Alert>
        )}

      {!noSearch &&
        !state.loading &&
        !focusVoting.loading &&
        !state.error &&
        !focusVoting.error && (
          <Stack spacing={3}>
            <DataCard sx={{ p: 2.5 }}>
              {selectedHallituskausi && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {tCommon("filteredByGovernmentPeriodLine", {
                    value: selectedHallituskausi.label,
                  })}
                </Alert>
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ mb: 0.5, ...commonStyles.compactTextLg }}>
                    {tVotings("filters.phase")}
                  </InputLabel>
                  <Select
                    value={phaseFilter}
                    size="small"
                    onChange={(event) => setPhaseFilter(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="all">{tVotings("filters.all")}</MenuItem>
                    {phases.map((phase) => (
                      <MenuItem key={phase} value={phase}>
                        {phase}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, ...commonStyles.compactTextLg }}>
                    {tVotings("filters.session")}
                  </InputLabel>
                  <Select
                    value={sessionFilter}
                    size="small"
                    onChange={(event) => setSessionFilter(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="all">{tVotings("filters.all")}</MenuItem>
                    {sessions.map((session) => (
                      <MenuItem key={session} value={session}>
                        {session}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, ...commonStyles.compactTextLg }}>
                    {tVotings("filters.sort")}
                  </InputLabel>
                  <Select
                    value={sortMode}
                    size="small"
                    onChange={(event) =>
                      setSortMode(event.target.value as SortMode)
                    }
                    fullWidth
                  >
                    <MenuItem value="newest">
                      {tVotings("sort.newest")}
                    </MenuItem>
                    <MenuItem value="oldest">
                      {tVotings("sort.oldest")}
                    </MenuItem>
                    <MenuItem value="closest">
                      {tVotings("sort.closest")}
                    </MenuItem>
                    <MenuItem value="largest">
                      {tVotings("sort.largest")}
                    </MenuItem>
                  </Select>
                </Box>
              </Box>
            </DataCard>

            {filtered.length === 0 ? (
              <DataCard sx={{ p: 4, textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ color: themedColors.textSecondary, mb: 0.5 }}
                >
                  {tVotings("noResults")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {tVotings("noResultsHint")}
                </Typography>
              </DataCard>
            ) : (
              <Stack spacing={1.5}>{renderGroups(grouped)}</Stack>
            )}
          </Stack>
        )}
    </Box>
  );
};
