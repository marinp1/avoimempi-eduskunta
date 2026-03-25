import BalanceIcon from "@mui/icons-material/Balance";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import {
  Box,
  CardActionArea,
  CardContent,
  Drawer,
  Grid,
  LinearProgress,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import CloseVotes from "#client/pages/Insights/CloseVotes";
import CoalitionOpposition from "#client/pages/Insights/CoalitionOpposition";
import { colors } from "#client/theme";
import { DataCard, InlineSpinner } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
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
  const themedColors = useThemedColors();
  const { t } = useScopedTranslation("votings");
  const [activeInsightDrawer, setActiveInsightDrawer] = React.useState<
    "closeVotes" | "coalitionOpposition" | null
  >(null);
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

      {/* Analytics sections */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: themedColors.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("analyticsSection.title")}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              key: "closeVotes" as const,
              icon: <BalanceIcon sx={{ fontSize: 24 }} />,
              title: t("analyticsSection.closeVotes.title"),
              description: t("analyticsSection.closeVotes.description"),
            },
            {
              key: "coalitionOpposition" as const,
              icon: <AccountBalanceIcon sx={{ fontSize: 24 }} />,
              title: t("analyticsSection.coalitionOpposition.title"),
              description: t("analyticsSection.coalitionOpposition.description"),
            },
          ].map((card) => (
            <Grid key={card.key} size={{ xs: 12, sm: 6 }}>
              <DataCard sx={{ height: "100%", p: 0 }}>
                <CardActionArea
                  onClick={() => setActiveInsightDrawer(card.key)}
                  sx={{ height: "100%", borderRadius: "inherit" }}
                >
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box sx={{ color: themedColors.primary, display: "flex", alignItems: "center" }}>
                        {card.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.3 }}>
                        {card.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: themedColors.textSecondary, lineHeight: 1.5 }}>
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </DataCard>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Drawer
        anchor="right"
        open={activeInsightDrawer === "closeVotes"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" }, maxWidth: "1400px" } }}
      >
        <CloseVotes onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
      <Drawer
        anchor="right"
        open={activeInsightDrawer === "coalitionOpposition"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" }, maxWidth: "1400px" } }}
      >
        <CoalitionOpposition onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
    </Box>
  );
};
