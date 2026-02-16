import HowToVoteIcon from "@mui/icons-material/HowToVote";
import InsightsIcon from "@mui/icons-material/Insights";
import LaunchIcon from "@mui/icons-material/Launch";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import RemoveIcon from "@mui/icons-material/Remove";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentCard,
  extractDocumentIdentifiers,
} from "#client/components/DocumentCards";
import { refs } from "#client/references";
import { colors, commonStyles } from "#client/theme";
import { DataCard, MetricCard, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { getVoteColors } from "#client/theme/vote-styles";

const CLOSE_VOTE_THRESHOLD = 10;

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

const emptyState: SearchState = {
  loading: false,
  error: null,
  rows: [],
};

const emptyFocusState: FocusVotingState = {
  loading: false,
  error: null,
  row: null,
};

const eduskuntaLink = (href: string) => {
  if (!href.startsWith("/")) return `https://www.eduskunta.fi/${href}`;
  return `https://www.eduskunta.fi${href}`;
};

const voteMargin = (vote: VotingSearchRow) => Math.abs(vote.n_yes - vote.n_no);

const isCloseVote = (vote: VotingSearchRow) =>
  voteMargin(vote) <= CLOSE_VOTE_THRESHOLD;

const isVotePassed = (vote: VotingSearchRow) => vote.n_yes > vote.n_no;

const getPrimaryTitle = (vote: VotingSearchRow) =>
  vote.context_title ||
  vote.section_title ||
  vote.main_section_title ||
  vote.agenda_title ||
  vote.title;

const getSecondaryTitle = (vote: VotingSearchRow) => {
  if (!vote.title || vote.title === getPrimaryTitle(vote)) return null;
  return vote.title;
};

const extractVotingDocRefs = (vote: VotingSearchRow) =>
  extractDocumentIdentifiers([
    vote.section_title,
    vote.main_section_title,
    vote.agenda_title,
    vote.parliamentary_item,
  ]);

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
    case "newest":
    default:
      return copy.sort((a, b) =>
        (b.start_time ?? "").localeCompare(a.start_time ?? ""),
      );
  }
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("fi-FI");
};

const formatTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
};


/** Single voting card in the results list */
const VotingCard: React.FC<{
  vote: VotingSearchRow;
  themedColors: ReturnType<typeof useThemedColors>;
  voteColors: ReturnType<typeof getVoteColors>;
}> = ({ vote, themedColors, voteColors }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const close = isCloseVote(vote);
  const passed = isVotePassed(vote);
  const docRefs = extractVotingDocRefs(vote);
  const primaryTitle = getPrimaryTitle(vote);
  const secondaryTitle = getSecondaryTitle(vote);

  const borderColor = passed
    ? `${themedColors.success}40`
    : `${themedColors.error}40`;

  return (
    <DataCard
      sx={{
        p: 0,
        borderLeft: `3px solid ${passed ? themedColors.success : themedColors.error}`,
        "&:hover": {
          borderColor: passed ? themedColors.success : themedColors.error,
        },
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Top row: date, session, phase chips */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary, fontWeight: 500 }}
          >
            {formatDate(vote.start_time)}
            {formatTime(vote.start_time)
              ? ` ${formatTime(vote.start_time)}`
              : ""}
          </Typography>
          <Link
            href={refs.session(vote.session_key, vote.start_time)}
            underline="hover"
            sx={{ fontWeight: 600, fontSize: "0.8rem" }}
          >
            {vote.session_key}
          </Link>
          <Chip
            size="small"
            label={vote.section_processing_phase}
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
          {close && (
            <Chip
              size="small"
              label={t("votings.closeVote")}
              sx={{
                height: 20,
                fontSize: "0.7rem",
                color: themedColors.warning,
                borderColor: `${themedColors.warning}66`,
              }}
              variant="outlined"
            />
          )}
          {Number.isFinite(vote.number) && (
            <Chip
              size="small"
              label={`#${vote.number}`}
              variant="outlined"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: themedColors.textPrimary,
            mb: 0.5,
            lineHeight: 1.4,
          }}
        >
          {primaryTitle || t("common.none")}
        </Typography>

        {secondaryTitle && (
          <Typography
            variant="body2"
            sx={{
              color: themedColors.textSecondary,
              mb: 0.75,
              lineHeight: 1.4,
            }}
          >
            {secondaryTitle}
          </Typography>
        )}

        {/* Context chips */}
        {(vote.agenda_title || vote.section_processing_title || vote.section_key) && (
          <Box sx={{ display: "flex", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
            {vote.agenda_title && (
              <Chip
                size="small"
                label={vote.agenda_title}
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 22 }}
              />
            )}
            {vote.section_processing_title && (
              <Chip
                size="small"
                label={vote.section_processing_title}
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 22 }}
              />
            )}
            {vote.section_key && (
              <Link
                href={refs.section(
                  vote.section_key,
                  vote.start_time,
                  vote.session_key,
                )}
                underline="none"
              >
                <Chip
                  size="small"
                  label={vote.section_key}
                  variant="outlined"
                  clickable
                  sx={{ fontSize: "0.7rem", height: 22 }}
                />
              </Link>
            )}
          </Box>
        )}

        {/* Vote bar + result */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 2 },
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 120, maxWidth: 300 }}>
            <VoteMarginBar
              yes={vote.n_yes}
              no={vote.n_no}
              empty={vote.n_abstain}
              absent={vote.n_absent}
              height={8}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            <HowToVoteIcon
              sx={{
                fontSize: 16,
                color: passed ? themedColors.success : themedColors.error,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: passed ? themedColors.success : themedColors.error,
              }}
            >
              {vote.n_yes} - {vote.n_no}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: themedColors.textTertiary }}
            >
              ({vote.n_abstain} {String(t("votings.results.empty")).toLowerCase()},{" "}
              {vote.n_absent} {String(t("votings.results.absent")).toLowerCase()})
            </Typography>
          </Box>
        </Box>

        {/* Links row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mt: 1,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={refs.voting(vote.id, vote.session_key, vote.start_time)}
            sx={{
              color: themedColors.primary,
              fontWeight: 600,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            #{vote.id}
          </Link>
          <Link
            target="_blank"
            rel="noreferrer"
            href={eduskuntaLink(vote.result_url)}
            sx={{
              color: voteColors.yes,
              fontWeight: 500,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            {t("votings.results.results")}
            <LaunchIcon sx={{ fontSize: 12 }} />
          </Link>
          <Link
            target="_blank"
            rel="noreferrer"
            href={eduskuntaLink(vote.proceedings_url)}
            sx={{
              color: themedColors.primary,
              fontWeight: 500,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            {t("votings.results.minutes")}
            <LaunchIcon sx={{ fontSize: 12 }} />
          </Link>
          {docRefs.length > 0 && (
            <Typography
              onClick={() => setExpanded(!expanded)}
              sx={{
                color: colors.primaryLight,
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {expanded
                ? t("votings.hideDocuments")
                : t("votings.showDocuments")}
            </Typography>
          )}
        </Box>

        {/* Linked document inline cards */}
        {docRefs.length > 0 && (
          <Collapse in={expanded}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Collapse>
        )}
      </Box>
    </DataCard>
  );
};

export const VoteResults: React.FC<{
  query: string;
  focusVotingId?: number | null;
  initialSessionFilter?: string | null;
}> = ({ query, focusVotingId, initialSessionFilter }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const voteColors = getVoteColors(themedColors);

  const [state, setState] = React.useState<SearchState>(emptyState);
  const [focusVoting, setFocusVoting] =
    React.useState<FocusVotingState>(emptyFocusState);
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
            error instanceof Error ? error.message : t("errors.unknownError"),
          rows: [],
        });
      }
    };

    run();
    return () => ac.abort();
  }, [normalizedQuery, t]);

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
            error: `${t("errors.loadFailed")}: ${t("common.none")}`,
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
            error instanceof Error ? error.message : t("errors.unknownError"),
          row: null,
        });
      }
    };

    run();
    return () => ac.abort();
  }, [focusVotingId, t]);

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
      if (phaseFilter !== "all" && row.section_processing_phase !== phaseFilter)
        return false;
      if (sessionFilter !== "all" && row.session_key !== sessionFilter)
        return false;
      return true;
    });
    return sortRows(rows, sortMode);
  }, [combinedRows, phaseFilter, sessionFilter, sortMode]);

  const aggregate = React.useMemo(() => {
    const total = filtered.length;
    const yes = filtered.reduce((sum, row) => sum + row.n_yes, 0);
    const no = filtered.reduce((sum, row) => sum + row.n_no, 0);
    const abstain = filtered.reduce((sum, row) => sum + row.n_abstain, 0);
    const absent = filtered.reduce((sum, row) => sum + row.n_absent, 0);
    const votesCast = yes + no + abstain;
    const possibleVotes = filtered.reduce((sum, row) => sum + row.n_total, 0);
    const closeVotes = filtered.filter(isCloseVote).length;
    const passedVotes = filtered.filter(isVotePassed).length;
    const avgMargin =
      total > 0
        ? filtered.reduce((sum, row) => sum + voteMargin(row), 0) / total
        : 0;
    const participationPct =
      possibleVotes > 0 ? (votesCast / possibleVotes) * 100 : 0;

    return {
      total,
      yes,
      no,
      abstain,
      absent,
      closeVotes,
      passedVotes,
      avgMargin,
      participationPct,
    };
  }, [filtered]);

  const closestVotes = React.useMemo(
    () => sortRows(filtered, "closest").slice(0, 5),
    [filtered],
  );

  const noSearch = normalizedQuery.length < 3 && !focusVotingId;

  return (
    <Box>
      {noSearch && (
        <DataCard sx={{ p: 4, textAlign: "center" }}>
          <InsightsIcon
            sx={{ fontSize: 36, color: themedColors.textTertiary, mb: 1 }}
          />
          <Typography variant="h6" sx={{ color: themedColors.textSecondary }}>
            {t("votings.startSearch")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: themedColors.textTertiary, mt: 0.5 }}
          >
            {t("votings.startSearchHint")}
          </Typography>
        </DataCard>
      )}

      {!noSearch && (state.loading || focusVoting.loading) && (
        <Box sx={{ ...commonStyles.centeredFlex, py: 5 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      )}

      {!noSearch &&
        !state.loading &&
        !focusVoting.loading &&
        (state.error || focusVoting.error) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t("errors.loadFailed")}: {state.error || focusVoting.error}
          </Alert>
        )}

      {!noSearch &&
        !state.loading &&
        !focusVoting.loading &&
        !state.error &&
        !focusVoting.error && (
          <Stack spacing={3}>
            <DataCard sx={{ p: 2.5 }}>
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
                  <InputLabel sx={{ mb: 0.5, fontSize: "0.75rem" }}>
                    {t("votings.filters.phase")}
                  </InputLabel>
                  <Select
                    value={phaseFilter}
                    size="small"
                    onChange={(event) => setPhaseFilter(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="all">{t("votings.filters.all")}</MenuItem>
                    {phases.map((phase) => (
                      <MenuItem key={phase} value={phase}>
                        {phase}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: "0.75rem" }}>
                    {t("votings.filters.session")}
                  </InputLabel>
                  <Select
                    value={sessionFilter}
                    size="small"
                    onChange={(event) => setSessionFilter(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="all">{t("votings.filters.all")}</MenuItem>
                    {sessions.map((session) => (
                      <MenuItem key={session} value={session}>
                        {session}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: "0.75rem" }}>
                    {t("votings.filters.sort")}
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
                      {t("votings.sort.newest")}
                    </MenuItem>
                    <MenuItem value="oldest">
                      {t("votings.sort.oldest")}
                    </MenuItem>
                    <MenuItem value="closest">
                      {t("votings.sort.closest")}
                    </MenuItem>
                    <MenuItem value="largest">
                      {t("votings.sort.largest")}
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
                  {t("votings.noResults")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {t("votings.noResultsHint")}
                </Typography>
              </DataCard>
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <MetricCard
                    label={t("votings.analysis.total")}
                    value={aggregate.total}
                    icon={<InsightsIcon sx={{ fontSize: 20 }} />}
                  />
                  <MetricCard
                    label={t("votings.analysis.participation")}
                    value={`${aggregate.participationPct.toFixed(1)}%`}
                    icon={<ThumbUpIcon sx={{ fontSize: 20 }} />}
                  />
                  <MetricCard
                    label={t("votings.analysis.closeVotes")}
                    value={aggregate.closeVotes}
                    icon={<WarningAmberIcon sx={{ fontSize: 20 }} />}
                  />
                  <MetricCard
                    label={t("votings.analysis.passed")}
                    value={`${aggregate.passedVotes}/${aggregate.total}`}
                    icon={<ThumbDownIcon sx={{ fontSize: 20 }} />}
                  />
                </Box>

                <DataCard sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ color: themedColors.textPrimary, mb: 1.5 }}
                  >
                    {t("votings.analysis.aggregateDistribution")}
                  </Typography>
                  <VoteMarginBar
                    yes={aggregate.yes}
                    no={aggregate.no}
                    empty={aggregate.abstain}
                    absent={aggregate.absent}
                    height={12}
                    sx={{ mb: 1.5 }}
                  />
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, 1fr)",
                        md: "repeat(4, 1fr)",
                      },
                      gap: 1.5,
                    }}
                  >
                    <Chip
                      icon={<ThumbUpIcon />}
                      label={`${t("votings.results.yes")}: ${aggregate.yes}`}
                    />
                    <Chip
                      icon={<ThumbDownIcon />}
                      label={`${t("votings.results.no")}: ${aggregate.no}`}
                    />
                    <Chip
                      icon={<RemoveIcon />}
                      label={`${t("votings.results.empty")}: ${aggregate.abstain}`}
                    />
                    <Chip
                      icon={<PersonOffIcon />}
                      label={`${t("votings.results.absent")}: ${aggregate.absent}`}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textSecondary, mt: 1.5 }}
                  >
                    {t("votings.analysis.avgMargin")}:{" "}
                    {aggregate.avgMargin.toFixed(1)}
                  </Typography>
                </DataCard>

                <DataCard sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ color: themedColors.textPrimary, mb: 1.5 }}
                  >
                    {t("votings.analysis.closestVotes")}
                  </Typography>
                  <Stack spacing={1.25}>
                    {closestVotes.map((vote) => (
                      <Box
                        key={vote.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: `1px solid ${themedColors.dataBorder}`,
                          background: colors.backgroundSubtle,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: themedColors.textPrimary,
                          }}
                        >
                          {getPrimaryTitle(vote)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          <Link
                            href={refs.session(
                              vote.session_key,
                              vote.start_time,
                            )}
                            underline="hover"
                            color="inherit"
                          >
                            {vote.session_key}
                          </Link>{" "}
                          | {t("votings.margin")}: {voteMargin(vote)} |{" "}
                          {vote.n_yes} - {vote.n_no}
                        </Typography>
                        {getSecondaryTitle(vote) && (
                          <Typography
                            variant="caption"
                            sx={{ color: themedColors.textTertiary }}
                          >
                            {getSecondaryTitle(vote)}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </DataCard>

                {/* Voting cards list */}
                <Stack spacing={1.5}>
                  {filtered.map((vote) => (
                    <VotingCard
                      key={vote.id}
                      vote={vote}
                      themedColors={themedColors}
                      voteColors={voteColors}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        )}
    </Box>
  );
};
