import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import {
  DocumentCard,
  extractDocumentIdentifiers,
} from "#client/components/DocumentCards";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { TraceRegistration } from "#client/context/TraceContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { colors, commonStyles } from "#client/theme";
import {
  DataCard,
  InlineSpinner,
  VoteMarginBar,
} from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateFi, formatTimeFi } from "#client/utils/date-time";
import { apiFetch } from "#client/utils/fetch";

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
  primary_title?: string | null;
  secondary_title?: string | null;
  document_refs?: ReturnType<typeof extractDocumentIdentifiers>;
  passed?: boolean;
  close?: boolean;
  margin?: number;
  group_key?: string | null;
};

type VotingFetchedDetails = ApiRouteResponse<`/api/votings/:id/details`>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLOSE_VOTE_THRESHOLD = 10;

const voteMargin = (v: VotingCardData) => Math.abs(v.n_yes - v.n_no);
const isVotePassed = (v: VotingCardData) => v.n_yes > v.n_no;
const isCloseVote = (v: VotingCardData) =>
  voteMargin(v) <= CLOSE_VOTE_THRESHOLD;

export const getPrimaryVotingTitle = (v: VotingCardData) =>
  v.primary_title ||
  v.context_title ||
  v.section_title ||
  v.main_section_title ||
  v.agenda_title ||
  v.title;

const getSecondaryTitle = (v: VotingCardData) => {
  if (typeof v.secondary_title !== "undefined") return v.secondary_title;
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
        const res = await apiFetch(`/api/votings/${votingId}/details`);
        if (res.ok) {
          const data = await res.json();
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
  const { t } = useScopedTranslation("common");
  const themedColors = useThemedColors();

  const yesLabel = String(t("yes")).toLowerCase();
  const noLabel = String(t("no")).toLowerCase();
  const emptyLabel = String(t("empty")).toLowerCase();
  const absentLabel = String(t("absent")).toLowerCase();

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
      sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: themedColors.success }}
      >
        {n_yes} {yesLabel}
      </Typography>
      <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
        ·
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: themedColors.error }}
      >
        {n_no} {noLabel}
      </Typography>
      <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
        ·
      </Typography>
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
  const { t: tCommon } = useScopedTranslation("common");
  const themedColors = useThemedColors();
  const docRefs = React.useMemo(
    () =>
      details
        ? extractDocumentIdentifiers([
            details.voting.parliamentary_item,
            details.voting.context_title,
            details.voting.title,
            details.voting.section_title,
            details.voting.main_section_title,
            details.voting.agenda_title,
          ])
        : [],
    [details],
  );

  if (loading) {
    return <InlineSpinner size={20} py={1} />;
  }

  if (!details) return null;

  const yesLabel = String(tCommon("yes")).toLowerCase();
  const noLabel = String(tCommon("no")).toLowerCase();

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
              label={tCommon("government")}
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
              label={tCommon("opposition")}
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

const VotingCardComponent: React.FC<{
  voting: VotingCardData;
}> = ({ voting }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tVotings } = useScopedTranslation("votings");
  const themedColors = useThemedColors();
  const { expanded, details, loading, toggle } = useVotingDetails(voting.id);

  const passed = voting.passed ?? isVotePassed(voting);
  const close = voting.close ?? isCloseVote(voting);
  const margin = voting.margin ?? voteMargin(voting);
  const primaryTitle = getPrimaryVotingTitle(voting);
  const secondaryTitle = getSecondaryTitle(voting);
  const docRefs = React.useMemo(
    () =>
      voting.document_refs ??
      extractDocumentIdentifiers([
        voting.parliamentary_item,
        voting.context_title,
        voting.section_title,
        voting.main_section_title,
        voting.agenda_title,
      ]),
    [
      voting.agenda_title,
      voting.context_title,
      voting.document_refs,
      voting.main_section_title,
      voting.parliamentary_item,
      voting.section_title,
    ],
  );

  return (
    <DataCard
      className="trace-hover-parent"
      sx={{
        p: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Zone 1 + 2 + 3: header, title, bar */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          pt: 1.5,
          pb: 1,
        }}
      >
        {/* Header row: outcome pill + meta */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            mb: 1,
            p: 0.75,
            borderRadius: 2,
            backgroundColor: `${themedColors.primary}03`,
            border: `1px solid ${themedColors.dataBorder}80`,
          }}
        >
          {/* Outcome pill — LEFT, prominent */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: 1.5,
              bgcolor: passed
                ? `${themedColors.success}15`
                : `${themedColors.error}15`,
              border: `1px solid ${passed ? `${themedColors.success}40` : `${themedColors.error}40`}`,
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
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {passed ? tVotings("passed") : tVotings("failed")}
            </Typography>
          </Box>

          {/* Date + session — right of outcome */}
          {voting.start_time && (
            <Typography
              variant="caption"
              sx={{ color: themedColors.textTertiary, fontWeight: 500 }}
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
              sx={{
                fontWeight: 600,
                fontSize: "0.78rem",
                color: themedColors.primary,
              }}
            >
              {voting.session_key}
            </Link>
          )}

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Close-vote chip + trace icon — far right */}
          {close && (
            <Chip
              size="small"
              label={`${tVotings("closeVote")} (${margin})`}
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
        </Box>
        <TraceRegistration
          table="SaliDBAanestys"
          pkName="AanestysId"
          pkValue={String(voting.id)}
          label={`Äänestys #${voting.number ?? voting.id}${voting.start_time ? ` – ${formatDate(voting.start_time)}` : ""}`}
        />

        {/* Zone 2: title */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: themedColors.textPrimary,
            lineHeight: 1.45,
            mb: secondaryTitle ? 0.25 : 1,
          }}
        >
          {primaryTitle || tCommon("none")}
        </Typography>
        {secondaryTitle && (
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary, lineHeight: 1.4, mb: 1 }}
          >
            {secondaryTitle}
          </Typography>
        )}

        {/* Section + phase chips row */}
        {(voting.section_key ||
          voting.section_processing_phase ||
          (Number.isFinite(voting.number) && voting.number != null)) && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
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
          </Box>
        )}

        {/* Zone 3: vote bar + counts */}
        <Box
          sx={{
            mt: 1.25,
            p: 1.1,
            borderRadius: 2,
            backgroundColor: `${themedColors.primary}03`,
            border: `1px solid ${themedColors.dataBorder}80`,
          }}
        >
          <VoteMarginBar
            yes={voting.n_yes}
            no={voting.n_no}
            empty={voting.n_abstain}
            absent={voting.n_absent}
            height={10}
            sx={{ mb: 0.75 }}
          />
          <VoteCountsDisplay
            n_yes={voting.n_yes}
            n_no={voting.n_no}
            n_abstain={voting.n_abstain}
            n_absent={voting.n_absent}
          />
        </Box>

        {/* Document cards */}
        {docRefs.length > 0 && (
          <Box sx={{ mt: 1.25 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}
      </Box>

      {/* Zone 4: actions footer */}
      <Box
        sx={{
          borderTop: `1px solid ${themedColors.dataBorder}`,
          px: { xs: 1.5, sm: 2 },
          py: 0.75,
          bgcolor: `${themedColors.primary}02`,
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
            ? tCommon("detailsToggle", { context: "hide" })
            : tCommon("detailsToggle", { context: "show" })}
        </Button>
        {voting.result_url && (
          <EduskuntaSourceLink
            href={voting.result_url}
            sx={{ fontSize: "0.78rem" }}
          >
            {tVotings("results.results")}
          </EduskuntaSourceLink>
        )}
        {voting.proceedings_url && (
          <EduskuntaSourceLink
            href={voting.proceedings_url}
            sx={{ fontSize: "0.78rem" }}
          >
            {tVotings("results.minutes")}
          </EduskuntaSourceLink>
        )}
        {/* Deemphasized ID link — far right */}
        <Link
          href={refs.voting(voting.id, voting.session_key, voting.start_time)}
          sx={{
            ml: "auto",
            color: themedColors.textTertiary,
            fontSize: "0.72rem",
          }}
        >
          #{voting.id}
        </Link>
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

export const VotingCard = React.memo(VotingCardComponent);

// ─── VotingSubRow (compact, for groups + Sessions inline) ────────────────────

const VotingSubRowComponent: React.FC<{
  voting: VotingCardData;
  /** Show voting.title if it differs from the group/section title */
  showTitle?: boolean;
  /** SPA navigate callback (e.g. Sessions "open in Votings page") */
  onOpenInView?: () => void;
}> = ({ voting, showTitle = false, onOpenInView }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tVotings } = useScopedTranslation("votings");
  const themedColors = useThemedColors();
  const { expanded, details, loading, toggle } = useVotingDetails(voting.id);

  const passed = isVotePassed(voting);
  const detailsPanelId = `voting-sub-details-${voting.id}`;

  return (
    <Box sx={{ py: 0.75 }}>
      {/* Line 1: outcome dot + phase chip + title */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          mb: 0.5,
          flexWrap: "wrap",
        }}
      >
        {/* Small outcome dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: passed ? themedColors.success : themedColors.error,
            flexShrink: 0,
          }}
        />

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
              minWidth: 60,
            }}
          />
        )}

        {showTitle && voting.title && (
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary, lineHeight: 1.3, flex: 1 }}
          >
            {voting.title}
          </Typography>
        )}
      </Box>

      {/* Line 2: vote bar + counts + actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          pl: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 100, maxWidth: 200 }}>
          <VoteMarginBar
            yes={voting.n_yes}
            no={voting.n_no}
            empty={voting.n_abstain}
            absent={voting.n_absent}
            height={6}
          />
        </Box>

        <VoteCountsDisplay
          n_yes={voting.n_yes}
          n_no={voting.n_no}
          n_abstain={voting.n_abstain}
          n_absent={voting.n_absent}
          compact
        />

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}
        >
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
              ? tCommon("detailsToggle", { context: "hide" })
              : tCommon("detailsToggle", { context: "show" })}
          </Button>
          {onOpenInView ? (
            <Button
              size="small"
              onClick={onOpenInView}
              sx={{ ...commonStyles.compactActionButton }}
            >
              {tCommon("openView")}
            </Button>
          ) : (
            <Link
              href={refs.voting(
                voting.id,
                voting.session_key,
                voting.start_time,
              )}
              sx={{
                color: themedColors.textTertiary,
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
              {tVotings("results.results")}
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

export const VotingSubRow = React.memo(VotingSubRowComponent);

// ─── VotingGroupCard ──────────────────────────────────────────────────────────

const VotingGroupCardComponent: React.FC<{
  votes: VotingCardData[];
}> = ({ votes }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tVotings } = useScopedTranslation("votings");
  const themedColors = useThemedColors();

  const first = votes[0];
  const groupTitle = getPrimaryVotingTitle(first);
  const docRefs = React.useMemo(
    () =>
      votes[0]?.document_refs ??
      extractDocumentIdentifiers(
        votes.flatMap((v) => [
          v.parliamentary_item,
          v.context_title,
          v.section_title,
          v.main_section_title,
          v.agenda_title,
        ]),
      ),
    [votes],
  );

  return (
    <DataCard
      sx={{
        p: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          pt: 1.5,
          pb: 1.5,
        }}
      >
        {/* Header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            mb: 1,
            p: 0.75,
            borderRadius: 2,
            backgroundColor: `${themedColors.primary}03`,
            border: `1px solid ${themedColors.dataBorder}80`,
          }}
        >
          {/* Vote count chip — prominent, LEFT */}
          <Chip
            size="small"
            label={tVotings("votingCount", { count: votes.length })}
            sx={{
              ...commonStyles.compactChipSm,
              ...commonStyles.compactTextMd,
              fontWeight: 700,
              bgcolor: `${themedColors.primary}12`,
              color: themedColors.primary,
            }}
          />

          {/* Date + session */}
          {first.start_time && (
            <Typography
              variant="caption"
              sx={{ color: themedColors.textTertiary, fontWeight: 500 }}
            >
              {formatDate(first.start_time)}
            </Typography>
          )}
          {first.session_key && (
            <Link
              href={refs.session(first.session_key, first.start_time)}
              underline="hover"
              sx={{
                fontWeight: 600,
                fontSize: "0.78rem",
                color: themedColors.primary,
              }}
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
        </Box>

        {/* Group title */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: themedColors.textPrimary,
            lineHeight: 1.45,
            mb: 1,
          }}
        >
          {groupTitle || tCommon("none")}
        </Typography>

        {/* Document cards */}
        {docRefs.length > 0 && (
          <Box sx={{ mb: 1.25 }}>
            {docRefs.map((ref) => (
              <DocumentCard key={ref.identifier} docRef={ref} />
            ))}
          </Box>
        )}

        {/* Sub-voting rows — separated with dividers */}
        <Stack
          spacing={0}
          sx={{
            p: 0.5,
            borderRadius: 2,
            backgroundColor: `${themedColors.primary}02`,
            border: `1px solid ${themedColors.dataBorder}70`,
          }}
          divider={
            <Box
              sx={{ height: "1px", bgcolor: themedColors.dataBorder, my: 0.5 }}
            />
          }
        >
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

export const VotingGroupCard = React.memo(VotingGroupCardComponent);
