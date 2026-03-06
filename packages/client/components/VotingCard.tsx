import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Link,
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
import { ItemTraceIcon } from "#client/components/ItemTraceIcon";
import {
  type VotingMemberVote,
  type VotingPartyBreakdown,
  VotingResultsTable,
} from "#client/components/VotingResultsTable";
import { refs } from "#client/references";
import { colors, commonStyles } from "#client/theme";
import { DataCard, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateFi, formatTimeFi } from "#client/utils/date-time";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VotingCardData = {
  id: number;
  number?: number | null;
  start_time?: string | null;
  session_key?: string | null;
  section_key?: string | null;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total?: number;
  title?: string | null;
  context_title?: string | null;
  section_title?: string | null;
  main_section_title?: string | null;
  agenda_title?: string | null;
  section_processing_phase?: string | null;
  section_processing_title?: string | null;
  parliamentary_item?: string | null;
  result_url?: string | null;
  proceedings_url?: string | null;
};

type VotingFetchedDetails = {
  voting: VotingCardData & {
    context_title: string | null;
    parliamentary_item: string | null;
    section_key: string | null;
    title: string | null;
    section_title: string | null;
    main_section_title: string | null;
    agenda_title: string | null;
  };
  partyBreakdown: VotingPartyBreakdown[];
  memberVotes: VotingMemberVote[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLOSE_VOTE_THRESHOLD = 10;

const voteMargin = (v: VotingCardData) => Math.abs(v.n_yes - v.n_no);
const isVotePassed = (v: VotingCardData) => v.n_yes > v.n_no;
const isCloseVote = (v: VotingCardData) =>
  voteMargin(v) <= CLOSE_VOTE_THRESHOLD;

export const getPrimaryVotingTitle = (v: VotingCardData) =>
  v.context_title ||
  v.section_title ||
  v.main_section_title ||
  v.agenda_title ||
  v.title;

const getSecondaryTitle = (v: VotingCardData) => {
  const primary = getPrimaryVotingTitle(v);
  if (!v.title || v.title === primary) return null;
  return v.title;
};

const formatDate = (s?: string | null) => formatDateFi(s);
const formatTime = (s?: string | null) => formatTimeFi(s, "");

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useVotingDetails = (votingId: number) => {
  const [expanded, setExpanded] = React.useState(false);
  const [details, setDetails] = React.useState<VotingFetchedDetails | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);

  const toggle = React.useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !details) {
      setLoading(true);
      try {
        const res = await fetch(`/api/votings/${votingId}/details`);
        if (res.ok) {
          const data: VotingFetchedDetails = await res.json();
          setDetails(data);
        }
      } finally {
        setLoading(false);
      }
    }
  }, [expanded, details, votingId]);

  return { expanded, details, loading, toggle };
};

// ─── VoteCountsDisplay ────────────────────────────────────────────────────────

const VoteCountsDisplay: React.FC<{
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  compact?: boolean;
}> = ({ n_yes, n_no, n_abstain, n_absent, compact = false }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const yesLabel = String(t("common.yes")).toLowerCase();
  const noLabel = String(t("common.no")).toLowerCase();
  const emptyLabel = String(t("common.empty")).toLowerCase();
  const absentLabel = String(t("common.absent")).toLowerCase();

  if (compact) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: themedColors.success }}
        >
          {n_yes}
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
          –
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: themedColors.error }}
        >
          {n_no}
        </Typography>
        {(n_abstain > 0 || n_absent > 0) && (
          <Typography
            variant="caption"
            sx={{ color: themedColors.textTertiary }}
          >
            ({n_abstain} {emptyLabel}, {n_absent} {absentLabel})
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 1.5, sm: 2 },
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#22C55E",
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: themedColors.success }}
        >
          {n_yes} {yesLabel}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#EF4444",
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: themedColors.error }}
        >
          {n_no} {noLabel}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
        {n_abstain} {emptyLabel} · {n_absent} {absentLabel}
      </Typography>
    </Box>
  );
};

// ─── VotingDetailsPanel ───────────────────────────────────────────────────────

const VotingDetailsPanel: React.FC<{
  details: VotingFetchedDetails | null;
  loading: boolean;
}> = ({ details, loading }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
        <CircularProgress size={14} />
        <Typography
          variant="caption"
          sx={{ color: themedColors.textSecondary }}
        >
          {t("common.loadingVotingDetails")}
        </Typography>
      </Box>
    );
  }

  if (!details) return null;

  const yesLabel = String(t("common.yes")).toLowerCase();
  const noLabel = String(t("common.no")).toLowerCase();

  const docRefs = extractDocumentIdentifiers([
    details.voting.parliamentary_item,
    details.voting.context_title,
    details.voting.title,
    details.voting.section_title,
    details.voting.main_section_title,
    details.voting.agenda_title,
  ]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {details.governmentOpposition && (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            p: 1,
            borderRadius: 1,
            bgcolor: `${themedColors.primary}05`,
            border: `1px solid ${themedColors.dataBorder}80`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("common.government")}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                bgcolor: `${colors.coalitionColor}15`,
                color: colors.coalitionColor,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary }}
            >
              <strong style={{ color: themedColors.success }}>
                {details.governmentOpposition.government_yes}
              </strong>{" "}
              {yesLabel} /{" "}
              <strong style={{ color: themedColors.error }}>
                {details.governmentOpposition.government_no}
              </strong>{" "}
              {noLabel}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("common.opposition")}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                bgcolor: `${colors.oppositionColor}15`,
                color: colors.oppositionColor,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary }}
            >
              <strong style={{ color: themedColors.success }}>
                {details.governmentOpposition.opposition_yes}
              </strong>{" "}
              {yesLabel} /{" "}
              <strong style={{ color: themedColors.error }}>
                {details.governmentOpposition.opposition_no}
              </strong>{" "}
              {noLabel}
            </Typography>
          </Box>
        </Box>
      )}
      <VotingResultsTable
        partyBreakdown={details.partyBreakdown}
        memberVotes={details.memberVotes}
      />
      {docRefs.length > 0 && (
        <Box>
          {docRefs.map((ref) => (
            <DocumentCard key={ref.identifier} docRef={ref} />
          ))}
        </Box>
      )}
    </Box>
  );
};

// ─── VotingCard (full standalone) ─────────────────────────────────────────────

export const VotingCard: React.FC<{
  voting: VotingCardData;
}> = ({ voting }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const { expanded, details, loading, toggle } = useVotingDetails(voting.id);

  const passed = isVotePassed(voting);
  const close = isCloseVote(voting);
  const margin = voteMargin(voting);
  const primaryTitle = getPrimaryVotingTitle(voting);
  const secondaryTitle = getSecondaryTitle(voting);
  const docRefs = extractDocumentIdentifiers([
    voting.parliamentary_item,
    voting.context_title,
    voting.section_title,
    voting.main_section_title,
    voting.agenda_title,
  ]);

  const borderColor = passed ? themedColors.success : themedColors.error;

  return (
    <DataCard
      className="trace-hover-parent"
      sx={{
        p: 0,
        borderLeft: `3px solid ${borderColor}`,
        overflow: "hidden",
        "&:hover": { borderColor },
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 1.25,
            flexWrap: "wrap",
          }}
        >
          {voting.start_time && (
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, fontWeight: 500 }}
            >
              {formatDate(voting.start_time)}
              {formatTime(voting.start_time)
                ? ` · ${formatTime(voting.start_time)}`
                : ""}
            </Typography>
          )}
          {voting.session_key && (
            <Link
              href={refs.session(voting.session_key, voting.start_time)}
              underline="hover"
              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
            >
              {voting.session_key}
            </Link>
          )}
          {voting.section_key && (
            <Link
              href={refs.section(
                voting.section_key,
                voting.start_time,
                voting.session_key,
              )}
              underline="none"
            >
              <Chip
                size="small"
                label={voting.section_key}
                variant="outlined"
                clickable
                sx={{
                  ...commonStyles.compactChipSm,
                  ...commonStyles.compactTextMd,
                }}
              />
            </Link>
          )}
          {voting.section_processing_phase && (
            <Chip
              size="small"
              label={voting.section_processing_phase}
              sx={{
                ...commonStyles.compactChipSm,
                ...commonStyles.compactTextMd,
              }}
            />
          )}
          {close && (
            <Chip
              size="small"
              label={`${t("votings.closeVote")} (${margin})`}
              icon={<FlashOnIcon sx={{ fontSize: "12px !important" }} />}
              variant="outlined"
              sx={{
                ...commonStyles.compactChipSm,
                ...commonStyles.compactTextMd,
                color: themedColors.warning,
                borderColor: `${themedColors.warning}66`,
                "& .MuiChip-icon": { color: themedColors.warning },
              }}
            />
          )}
          {Number.isFinite(voting.number) && voting.number != null && (
            <Chip
              size="small"
              label={`#${voting.number}`}
              variant="outlined"
              sx={{
                ...commonStyles.compactChipSm,
                ...commonStyles.compactTextMd,
              }}
            />
          )}
          <Box sx={{ ml: "auto" }}>
            <ItemTraceIcon
              table="SaliDBAanestys"
              pkName="AanestysId"
              pkValue={String(voting.id)}
              label={`Äänestys #${voting.number ?? voting.id}${voting.start_time ? ` – ${formatDate(voting.start_time)}` : ""}`}
            />
          </Box>
        </Box>

        {/* Title + status badge */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            mb: 1.25,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: "0.9375rem",
                color: themedColors.textPrimary,
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
                  mt: 0.25,
                  lineHeight: 1.4,
                }}
              >
                {secondaryTitle}
              </Typography>
            )}
          </Box>
          {/* Status badge */}
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: 2,
              bgcolor: passed
                ? `${themedColors.success}12`
                : `${themedColors.error}12`,
              border: `1px solid ${
                passed ? `${themedColors.success}35` : `${themedColors.error}35`
              }`,
            }}
          >
            {passed ? (
              <CheckCircleOutlineIcon
                sx={{ fontSize: 13, color: themedColors.success }}
              />
            ) : (
              <CancelOutlinedIcon
                sx={{ fontSize: 13, color: themedColors.error }}
              />
            )}
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: passed ? themedColors.success : themedColors.error,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {passed ? t("votings.passed") : t("votings.failed")}
            </Typography>
          </Box>
        </Box>

        {/* Vote bar */}
        <VoteMarginBar
          yes={voting.n_yes}
          no={voting.n_no}
          empty={voting.n_abstain}
          absent={voting.n_absent}
          height={8}
          sx={{ mb: 0.75 }}
        />

        {/* Vote counts */}
        <Box sx={{ mb: 1.25 }}>
          <VoteCountsDisplay
            n_yes={voting.n_yes}
            n_no={voting.n_no}
            n_abstain={voting.n_abstain}
            n_absent={voting.n_absent}
          />
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            size="small"
            onClick={() => void toggle()}
            sx={{ ...commonStyles.compactActionButton }}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  fontSize: "14px !important",
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            }
          >
            {expanded
              ? t("common.detailsToggle", { context: "hide" })
              : t("common.detailsToggle", { context: "show" })}
          </Button>
          <Link
            href={refs.voting(voting.id, voting.session_key, voting.start_time)}
            sx={{
              color: themedColors.primary,
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            #{voting.id}
          </Link>
          {voting.result_url && (
            <EduskuntaSourceLink
              href={voting.result_url}
              sx={{ fontSize: "0.8rem" }}
            >
              {t("votings.results.results")}
            </EduskuntaSourceLink>
          )}
          {voting.proceedings_url && (
            <EduskuntaSourceLink
              href={voting.proceedings_url}
              sx={{ fontSize: "0.8rem" }}
            >
              {t("votings.results.minutes")}
            </EduskuntaSourceLink>
          )}
        </Box>

        {/* Document cards */}
        {docRefs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}
      </Box>

      {/* Details panel */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            borderTop: `1px solid ${themedColors.dataBorder}`,
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            bgcolor: `${themedColors.primary}03`,
          }}
        >
          <VotingDetailsPanel details={details} loading={loading} />
        </Box>
      </Collapse>
    </DataCard>
  );
};

// ─── VotingSubRow (compact, for groups + Sessions inline) ────────────────────

export const VotingSubRow: React.FC<{
  voting: VotingCardData;
  /** Show voting.title if it differs from the group/section title */
  showTitle?: boolean;
  /** SPA navigate callback (e.g. Sessions "open in Votings page") */
  onOpenInView?: () => void;
}> = ({ voting, showTitle = false, onOpenInView }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const { expanded, details, loading, toggle } = useVotingDetails(voting.id);

  const passed = isVotePassed(voting);
  const detailsPanelId = `voting-sub-details-${voting.id}`;

  return (
    <Box
      sx={{
        borderLeft: `3px solid ${passed ? themedColors.success : themedColors.error}`,
        pl: 1.25,
        py: 0.75,
        borderRadius: "0 4px 4px 0",
      }}
    >
      {/* Optional title */}
      {showTitle && voting.title && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: themedColors.textSecondary,
            mb: 0.5,
            lineHeight: 1.3,
          }}
        >
          {voting.title}
        </Typography>
      )}

      {/* Main row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {/* Phase chip */}
        {(voting.section_processing_phase ||
          voting.section_processing_title) && (
          <Chip
            size="small"
            label={
              voting.section_processing_phase || voting.section_processing_title
            }
            sx={{
              ...commonStyles.compactChipSm,
              ...commonStyles.compactTextMd,
              minWidth: 72,
            }}
          />
        )}

        {/* Mini vote bar */}
        <Box sx={{ flex: 1, minWidth: 80, maxWidth: 180 }}>
          <VoteMarginBar
            yes={voting.n_yes}
            no={voting.n_no}
            empty={voting.n_abstain}
            absent={voting.n_absent}
            height={6}
          />
        </Box>

        {/* Compact counts */}
        <VoteCountsDisplay
          n_yes={voting.n_yes}
          n_no={voting.n_no}
          n_abstain={voting.n_abstain}
          n_absent={voting.n_absent}
          compact
        />

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Button
            size="small"
            onClick={() => void toggle()}
            aria-expanded={expanded}
            aria-controls={detailsPanelId}
            sx={{ ...commonStyles.compactActionButton }}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  fontSize: "14px !important",
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            }
          >
            {expanded
              ? t("common.detailsToggle", { context: "hide" })
              : t("common.detailsToggle", { context: "show" })}
          </Button>
          {onOpenInView ? (
            <Button
              size="small"
              onClick={onOpenInView}
              sx={{ ...commonStyles.compactActionButton }}
            >
              {t("common.openView")}
            </Button>
          ) : (
            <Link
              href={refs.voting(
                voting.id,
                voting.session_key,
                voting.start_time,
              )}
              sx={{
                color: themedColors.primary,
                fontWeight: 600,
                ...commonStyles.compactTextLg,
              }}
            >
              #{voting.id}
            </Link>
          )}
          {voting.result_url && (
            <EduskuntaSourceLink
              href={voting.result_url}
              sx={{ ...commonStyles.compactTextLg }}
            >
              {t("votings.results.results")}
            </EduskuntaSourceLink>
          )}
        </Box>
      </Box>

      {/* Details panel */}
      <Collapse id={detailsPanelId} in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 0.75,
            p: 1,
            borderRadius: 1,
            border: `1px solid ${themedColors.dataBorder}60`,
            bgcolor: `${themedColors.primary}04`,
          }}
        >
          <VotingDetailsPanel details={details} loading={loading} />
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── VotingGroupCard ──────────────────────────────────────────────────────────

export const VotingGroupCard: React.FC<{
  votes: VotingCardData[];
}> = ({ votes }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const first = votes[0];
  const allPassed = votes.every(isVotePassed);
  const anyPassed = votes.some(isVotePassed);
  const borderColor = allPassed
    ? themedColors.success
    : anyPassed
      ? themedColors.warning
      : themedColors.error;

  const groupTitle = getPrimaryVotingTitle(first);
  const docRefs = extractDocumentIdentifiers(
    votes.flatMap((v) => [
      v.parliamentary_item,
      v.context_title,
      v.section_title,
      v.main_section_title,
      v.agenda_title,
    ]),
  );

  return (
    <DataCard
      sx={{
        p: 0,
        borderLeft: `3px solid ${borderColor}`,
        overflow: "hidden",
        "&:hover": { borderColor },
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 1.25,
            flexWrap: "wrap",
          }}
        >
          {first.start_time && (
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, fontWeight: 500 }}
            >
              {formatDate(first.start_time)}
            </Typography>
          )}
          {first.session_key && (
            <Link
              href={refs.session(first.session_key, first.start_time)}
              underline="hover"
              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
            >
              {first.session_key}
            </Link>
          )}
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
            mb: docRefs.length > 0 ? 0.75 : 1.25,
            lineHeight: 1.4,
          }}
        >
          {groupTitle || t("common.none")}
        </Typography>

        {/* Document cards */}
        {docRefs.length > 0 && (
          <Box sx={{ mb: 1.25 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}

        {/* Sub-voting rows */}
        <Stack spacing={0.5}>
          {votes.map((vote) => (
            <VotingSubRow
              key={vote.id}
              voting={vote}
              showTitle={
                vote.title != null &&
                vote.title !== getPrimaryVotingTitle(first)
              }
            />
          ))}
        </Stack>
      </Box>
    </DataCard>
  );
};
