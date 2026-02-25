import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import InsightsIcon from "@mui/icons-material/Insights";
import {
  Alert,
  Box,
  Button,
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
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { refs } from "#client/references";
import { commonStyles } from "#client/theme";
import { DataCard, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { getVoteColors } from "#client/theme/vote-styles";
import { formatDateFi, formatTimeFi } from "#client/utils/date-time";

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

type VotingInlineDetails = {
  voting: VotingSearchRow & {
    n_abstain: number;
    n_absent: number;
    title: string | null;
    parliamentary_item: string | null;
    section_key: string | null;
  };
  partyBreakdown: {
    party_code: string;
    party_name: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
  }[];
  memberVotes: {
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: 0 | 1;
  }[];
  governmentOpposition: {
    government_yes: number;
    government_no: number;
    government_abstain: number;
    government_absent: number;
    government_total: number;
    opposition_yes: number;
    opposition_no: number;
    opposition_abstain: number;
    opposition_absent: number;
    opposition_total: number;
  } | null;
  relatedVotings: {
    id: number;
    number: number | null;
    start_time: string | null;
    context_title: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
    session_key: string | null;
  }[];
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

const extractGroupDocRefs = (votes: VotingSearchRow[]) => {
  const allFields = votes.flatMap((v) => [
    v.section_title,
    v.main_section_title,
    v.agenda_title,
    v.parliamentary_item,
  ]);
  return extractDocumentIdentifiers(allFields);
};

/** Get the primary document identifier for grouping (e.g. "HE 45/2024 vp") */
const getDocumentGroupKey = (vote: VotingSearchRow): string | null => {
  const refs = extractDocumentIdentifiers([
    vote.parliamentary_item,
    vote.section_title,
    vote.main_section_title,
    vote.agenda_title,
  ]);
  return refs.length > 0 ? refs[0].identifier : null;
};

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

const formatDate = (dateStr: string | null | undefined) =>
  formatDateFi(dateStr);

const formatTime = (dateStr: string | null | undefined) =>
  formatTimeFi(dateStr, "");

/** Compact voting row inside a multi-voting group */
const VotingRow: React.FC<{
  vote: VotingSearchRow;
  showTitle: boolean;
  themedColors: ReturnType<typeof useThemedColors>;
  voteColors: ReturnType<typeof getVoteColors>;
  isExpanded?: boolean;
  details?: VotingInlineDetails;
  detailsLoading?: boolean;
  onToggleDetails?: (votingId: number) => void;
}> = ({
  vote,
  showTitle,
  themedColors,
  voteColors,
  isExpanded = false,
  details,
  detailsLoading = false,
  onToggleDetails,
}) => {
  const { t } = useTranslation();
  const passed = isVotePassed(vote);
  const close = isCloseVote(vote);
  const detailDocRefs = details
    ? extractDocumentIdentifiers([
        details.voting.parliamentary_item,
        details.voting.title,
        details.voting.section_title,
        details.voting.main_section_title,
        details.voting.agenda_title,
      ])
    : [];
  const detailsPanelId = `voting-inline-details-${vote.id}`;
  const detailsToggleId = `voting-inline-toggle-${vote.id}`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 1.5 },
        py: 0.75,
        flexWrap: "wrap",
        borderLeft: `3px solid ${passed ? themedColors.success : themedColors.error}`,
        pl: 1.5,
        borderRadius: 0.5,
      }}
    >
      {/* Phase chip */}
      <Chip
        size="small"
        label={vote.section_processing_phase || vote.section_processing_title}
        sx={{
          ...commonStyles.compactChipSm,
          ...commonStyles.compactTextMd,
          minWidth: 80,
        }}
      />

      {close && (
        <Chip
          size="small"
          label={t("votings.closeVote")}
          sx={{
            ...commonStyles.compactChipSm,
            ...commonStyles.compactTextMd,
            color: themedColors.warning,
            borderColor: `${themedColors.warning}66`,
          }}
          variant="outlined"
        />
      )}

      {/* Vote bar */}
      <Box sx={{ flex: 1, minWidth: 80, maxWidth: 200 }}>
        <VoteMarginBar
          yes={vote.n_yes}
          no={vote.n_no}
          empty={vote.n_abstain}
          absent={vote.n_absent}
          height={6}
        />
      </Box>

      {/* Result */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <HowToVoteIcon
          sx={{
            fontSize: 14,
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
        <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
          ({vote.n_abstain} {String(t("votings.results.empty")).toLowerCase()},{" "}
          {vote.n_absent} {String(t("votings.results.absent")).toLowerCase()})
        </Typography>
      </Box>

      {/* Links */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {onToggleDetails && (
          <Button
            size="small"
            id={detailsToggleId}
            onClick={() => onToggleDetails(vote.id)}
            aria-expanded={isExpanded}
            aria-controls={detailsPanelId}
            sx={{
              ...commonStyles.compactActionButton,
            }}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  fontSize: 14,
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            }
          >
            {isExpanded
              ? t("common.detailsToggle", { context: "hide" })
              : t("common.detailsToggle", { context: "show" })}
          </Button>
        )}
        <Link
          href={refs.voting(vote.id, vote.session_key, vote.start_time)}
          sx={{
            color: themedColors.primary,
            fontWeight: 600,
            ...commonStyles.compactTextLg,
          }}
        >
          #{vote.id}
        </Link>
        <EduskuntaSourceLink
          href={vote.result_url}
          sx={{
            ...commonStyles.compactTextLg,
            color: voteColors.yes,
          }}
        >
          {t("votings.results.results")}
        </EduskuntaSourceLink>
      </Box>

      {/* Title (only if different from group title) */}
      {showTitle && (
        <Typography
          variant="caption"
          sx={{
            color: themedColors.textSecondary,
            width: "100%",
            lineHeight: 1.3,
          }}
        >
          {vote.title}
        </Typography>
      )}
      <Collapse
        id={detailsPanelId}
        aria-labelledby={detailsToggleId}
        in={!!onToggleDetails && isExpanded}
        timeout="auto"
        unmountOnExit
      >
        <Box
          sx={{
            width: "100%",
            mt: 0.5,
            p: 1,
            borderRadius: 1,
            border: `1px solid ${themedColors.dataBorder}60`,
            backgroundColor: `${themedColors.primary}06`,
          }}
        >
          {detailsLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={12} />
              <Typography
                variant="caption"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("common.loadingVotingDetails")}
              </Typography>
            </Box>
          )}
          {!detailsLoading && details && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography
                variant="caption"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("common.votingTargetLine", {
                  value:
                    details.voting.context_title ||
                    details.voting.section_title ||
                    details.voting.title ||
                    "(ei otsikkoa)",
                })}
              </Typography>
              {details.voting.parliamentary_item && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={details.voting.parliamentary_item}
                  sx={{ ...commonStyles.compactChipSm, width: "fit-content" }}
                />
              )}
              {details.governmentOpposition && (
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textSecondary }}
                >
                  Hallitus: {details.governmentOpposition.government_yes} jaa /{" "}
                  {details.governmentOpposition.government_no} ei, Oppositio:{" "}
                  {details.governmentOpposition.opposition_yes} jaa /{" "}
                  {details.governmentOpposition.opposition_no} ei
                </Typography>
              )}
              <VotingResultsTable
                partyBreakdown={details.partyBreakdown}
                memberVotes={details.memberVotes}
              />
              {detailDocRefs.length > 0 && (
                <Box>
                  {detailDocRefs.map((ref) => (
                    <DocumentCard
                      key={`${vote.id}-${ref.identifier}`}
                      docRef={ref}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

/** Single voting card (used for singleton groups) */
const VotingCard: React.FC<{
  vote: VotingSearchRow;
  themedColors: ReturnType<typeof useThemedColors>;
  voteColors: ReturnType<typeof getVoteColors>;
}> = ({ vote, themedColors, voteColors }) => {
  const { t } = useTranslation();
  const close = isCloseVote(vote);
  const passed = isVotePassed(vote);
  const docRefs = extractGroupDocRefs([vote]);
  const primaryTitle = getPrimaryTitle(vote);
  const secondaryTitle = getSecondaryTitle(vote);

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
            sx={{
              ...commonStyles.compactChipSm,
              ...commonStyles.compactTextMd,
            }}
          />
          {close && (
            <Chip
              size="small"
              label={t("votings.closeVote")}
              sx={{
                ...commonStyles.compactChipSm,
                ...commonStyles.compactTextMd,
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
              sx={{
                ...commonStyles.compactChipSm,
                ...commonStyles.compactTextMd,
              }}
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
                sx={{
                  ...commonStyles.compactChipSm,
                  ...commonStyles.compactTextMd,
                }}
              />
            </Link>
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
              ({vote.n_abstain}{" "}
              {String(t("votings.results.empty")).toLowerCase()},{" "}
              {vote.n_absent}{" "}
              {String(t("votings.results.absent")).toLowerCase()})
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
          <EduskuntaSourceLink
            href={vote.result_url}
            sx={{
              fontSize: "0.8rem",
              color: voteColors.yes,
            }}
          >
            {t("votings.results.results")}
          </EduskuntaSourceLink>
          <EduskuntaSourceLink
            href={vote.proceedings_url}
            sx={{
              fontSize: "0.8rem",
            }}
          >
            {t("votings.results.minutes")}
          </EduskuntaSourceLink>
        </Box>

        {/* Inline document context */}
        {docRefs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}
      </Box>
    </DataCard>
  );
};

/** Grouped voting card — multiple votings on the same subject */
const VotingGroupCard: React.FC<{
  votes: VotingSearchRow[];
  themedColors: ReturnType<typeof useThemedColors>;
  voteColors: ReturnType<typeof getVoteColors>;
}> = ({ votes, themedColors, voteColors }) => {
  const { t } = useTranslation();
  const first = votes[0];
  const groupTitle = getPrimaryTitle(first);
  const docRefs = extractGroupDocRefs(votes);
  const [expandedVotingIds, setExpandedVotingIds] = React.useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = React.useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = React.useState<
    Set<number>
  >(new Set());

  const allPassed = votes.every(isVotePassed);
  const anyPassed = votes.some(isVotePassed);
  const borderColor = allPassed
    ? themedColors.success
    : anyPassed
      ? themedColors.warning
      : themedColors.error;

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId))
      return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await fetch(`/api/votings/${votingId}/details`);
      if (!res.ok) return;
      const data: VotingInlineDetails = await res.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const toggleVotingDetails = (votingId: number) => {
    const shouldExpand = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (shouldExpand) {
      void fetchVotingDetails(votingId);
    }
  };

  return (
    <DataCard
      sx={{
        p: 0,
        borderLeft: `3px solid ${borderColor}`,
        "&:hover": { borderColor },
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Group header */}
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
            {formatDate(first.start_time)}
          </Typography>
          <Link
            href={refs.session(first.session_key, first.start_time)}
            underline="hover"
            sx={{ fontWeight: 600, fontSize: "0.8rem" }}
          >
            {first.session_key}
          </Link>
          {first.section_key && (
            <Link
              href={refs.section(
                first.section_key,
                first.start_time,
                first.session_key,
              )}
              underline="none"
            >
              <Chip
                size="small"
                label={first.section_key}
                variant="outlined"
                clickable
                sx={{
                  ...commonStyles.compactChipSm,
                  ...commonStyles.compactTextMd,
                }}
              />
            </Link>
          )}
          <Chip
            size="small"
            label={t("votings.votingCount", { count: votes.length })}
            sx={{
              ...commonStyles.compactChipSm,
              ...commonStyles.compactTextMd,
              fontWeight: 600,
              bgcolor: `${themedColors.primary}15`,
              color: themedColors.primary,
            }}
          />
        </Box>

        {/* Group title */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: themedColors.textPrimary,
            mb: 0.5,
            lineHeight: 1.4,
          }}
        >
          {groupTitle || t("common.none")}
        </Typography>

        {/* Inline document context at group level */}
        {docRefs.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}

        {/* Individual voting rows */}
        <Stack spacing={0.75}>
          {votes.map((vote) => (
            <VotingRow
              key={vote.id}
              vote={vote}
              showTitle={
                vote.title !== null && vote.title !== getPrimaryTitle(first)
              }
              themedColors={themedColors}
              voteColors={voteColors}
              isExpanded={expandedVotingIds.has(vote.id)}
              details={votingDetailsById[vote.id]}
              detailsLoading={loadingVotingDetails.has(vote.id)}
              onToggleDetails={toggleVotingDetails}
            />
          ))}
        </Stack>
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
  const { selectedHallituskausi } = useHallituskausi();
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
            error instanceof Error ? error.message : t("errors.unknownError"),
          rows: [],
        });
      }
    };

    run();
    return () => ac.abort();
  }, [normalizedQuery, selectedHallituskausi, t]);

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
            error: t("errors.loadFailedWithReason", {
              reason: t("common.none"),
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

    // Sort within each group by timestamp ascending (chronological order)
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
            {t("errors.loadFailedWithReason", {
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
                  Rajattu hallituskauteen: {selectedHallituskausi.label}
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
                  <InputLabel sx={{ mb: 0.5, ...commonStyles.compactTextLg }}>
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
                  <InputLabel sx={{ mb: 0.5, ...commonStyles.compactTextLg }}>
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
              <Stack spacing={1.5}>
                {grouped.map((group) =>
                  group.length === 1 ? (
                    <VotingCard
                      key={group[0].id}
                      vote={group[0]}
                      themedColors={themedColors}
                      voteColors={voteColors}
                    />
                  ) : (
                    <VotingGroupCard
                      key={group.map((v) => v.id).join("-")}
                      votes={group}
                      themedColors={themedColors}
                      voteColors={voteColors}
                    />
                  ),
                )}
              </Stack>
            )}
          </Stack>
        )}
    </Box>
  );
};
