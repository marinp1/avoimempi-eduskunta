import { Box, LinearProgress } from "@mui/material";
import React from "react";
import { colors } from "#client/theme";
import { InlineSpinner } from "#client/theme/components";
import {
  buildVotingsUrl,
  DEFAULT_VOTINGS_PHASE,
  DEFAULT_VOTINGS_SESSION,
  DEFAULT_VOTINGS_SORT,
  parseVotingsUrlState,
  type VotingSortMode,
} from "./url-state";
import { VoteResults } from "./VoteResults";

export default () => {
  const getUrlState = React.useCallback(
    () => parseVotingsUrlState(window.location.search),
    [],
  );
  const initialState = React.useMemo(() => getUrlState(), [getUrlState]);

  const [search, setSearch] = React.useState(initialState.query);
  const [focusVotingId, setFocusVotingId] = React.useState<number | null>(
    initialState.voting,
  );
  const [sessionFilter, setSessionFilter] = React.useState(
    initialState.session,
  );
  const [phaseFilter, setPhaseFilter] = React.useState(initialState.phase);
  const [sortMode, setSortMode] = React.useState<VotingSortMode>(
    initialState.sort,
  );
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  React.useEffect(() => {
    const handlePopState = () => {
      const next = getUrlState();
      setSearch(next.query);
      setFocusVotingId(next.voting);
      setSessionFilter(next.session);
      setPhaseFilter(next.phase);
      setSortMode(next.sort);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [getUrlState]);

  React.useEffect(() => {
    const nextUrl = buildVotingsUrl(
      window.location.pathname,
      window.location.search,
      {
        query: search,
        session: sessionFilter,
        phase: phaseFilter,
        sort: sortMode,
        voting: focusVotingId,
      },
    );
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [focusVotingId, phaseFilter, search, sessionFilter, sortMode]);

  const clearFilters = React.useCallback(() => {
    React.startTransition(() => {
      setSearch("");
      setFocusVotingId(null);
      setSessionFilter(DEFAULT_VOTINGS_SESSION);
      setPhaseFilter(DEFAULT_VOTINGS_PHASE);
      setSortMode(DEFAULT_VOTINGS_SORT);
    });
  }, []);

  return (
    <Box>
      {isStale && (
        <LinearProgress
          sx={{
            mb: 1.5,
            height: 2,
            borderRadius: 1,
            backgroundColor: `${colors.primaryLight}20`,
            "& .MuiLinearProgress-bar": {
              backgroundColor: colors.primaryLight,
            },
          }}
        />
      )}

      <React.Suspense fallback={<InlineSpinner />}>
        <Box
          sx={{
            opacity: isStale ? 0.6 : 1,
            transition: isStale
              ? "opacity 0.2s 0.2s linear"
              : "opacity 0s 0s linear",
          }}
        >
          <VoteResults
            query={deferredQuery}
            focusVotingId={focusVotingId}
            sessionFilter={sessionFilter}
            phaseFilter={phaseFilter}
            sortMode={sortMode}
            onSearchChange={setSearch}
            onSessionFilterChange={setSessionFilter}
            onPhaseFilterChange={setPhaseFilter}
            onSortModeChange={setSortMode}
            onFocusVotingChange={setFocusVotingId}
            onClearFilters={clearFilters}
            searchValue={search}
          />
        </Box>
      </React.Suspense>
    </Box>
  );
};
